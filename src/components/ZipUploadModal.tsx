import React, { useState, useRef } from 'react';
import { Upload, FileArchive, CheckCircle, AlertCircle, RefreshCw, X, FileCheck, Info } from 'lucide-react';
import JSZip from 'jszip';
import { ImportResult } from '../types';

interface ZipUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  onShowToast: (msg: string) => void;
}

export const ZipUploadModal: React.FC<ZipUploadModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  onShowToast
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.toLowerCase().endsWith('.zip')) {
        setSelectedFile(file);
        setImportResult(null);
      } else {
        onShowToast('Por favor, selecione um arquivo no formato .ZIP');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.zip')) {
        setSelectedFile(file);
        setImportResult(null);
      } else {
        onShowToast('Selecione um arquivo .ZIP válido.');
      }
    }
  };

  const handleUploadZip = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setImportResult(null);
    setProgressMessage('Lendo e extraindo arquivo ZIP no seu navegador...');

    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(selectedFile);

      const allItems: any[] = [];
      const errors: string[] = [];

      const entries = Object.entries(contents.files);
      for (const [relativePath, fileObj] of entries) {
        const normPath = relativePath.replace(/\\/g, '/');
        const fileName = normPath.split('/').pop() || '';

        if (
          !fileObj.dir &&
          !normPath.includes('__MACOSX') &&
          !fileName.startsWith('.') &&
          !fileName.startsWith('._')
        ) {
          try {
            const rawContent = await fileObj.async('string');
            const cleanContent = rawContent.replace(/^\uFEFF/, '').trim();

            const isJsonExt = normPath.toLowerCase().endsWith('.json');
            const isJsonContent = cleanContent.startsWith('{') || cleanContent.startsWith('[');

            if (cleanContent && (isJsonExt || isJsonContent)) {
              let parsed: any;
              try {
                parsed = JSON.parse(cleanContent);
              } catch (err1) {
                const stripped = cleanContent
                  .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*/g, '$1')
                  .replace(/,\s*([}\]])/g, '$1');
                parsed = JSON.parse(stripped);
              }

              if (Array.isArray(parsed)) {
                allItems.push(...parsed);
              } else if (parsed && typeof parsed === 'object') {
                if (Array.isArray(parsed.leads)) allItems.push(...parsed.leads);
                else if (Array.isArray(parsed.data)) allItems.push(...parsed.data);
                else if (Array.isArray(parsed.clients)) allItems.push(...parsed.clients);
                else if (Array.isArray(parsed.items)) allItems.push(...parsed.items);
                else if (Array.isArray(parsed.results)) allItems.push(...parsed.results);
                else allItems.push(parsed);
              }
            }
          } catch (e: any) {
            errors.push(`Erro ao ler ${normPath}: ${e.message}`);
          }
        }
      }

      if (allItems.length === 0) {
        // Fallback: try direct server upload if browser parsing returned empty
        setProgressMessage('Nenhum JSON lido localmente. Enviando para o servidor...');
        const formData = new FormData();
        formData.append('zipFile', selectedFile);
        const res = await fetch('/api/upload-zip', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) {
          setImportResult(data);
          onImportComplete();
        } else {
          onShowToast(data.error || 'Erro ao processar o arquivo ZIP.');
        }
        return;
      }

      // Send extracted lead items in chunks of 200 to /api/leads/batch
      const chunkSize = 200;
      let totalInserted = 0;
      let totalDuplicates = 0;
      let totalProcessed = 0;

      for (let i = 0; i < allItems.length; i += chunkSize) {
        const chunk = allItems.slice(i, i + chunkSize);
        setProgressMessage(`Salvando leads no sistema... (${Math.min(i + chunkSize, allItems.length)} / ${allItems.length})`);

        const res = await fetch('/api/leads/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: chunk })
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Erro no servidor: ${text.substring(0, 100)}`);
        }

        const batchResult = await res.json();
        totalInserted += batchResult.insertedCount || 0;
        totalDuplicates += batchResult.skippedDuplicates || 0;
        totalProcessed += batchResult.totalProcessed || 0;
      }

      const finalResult: ImportResult = {
        totalProcessed,
        insertedCount: totalInserted,
        skippedDuplicates: totalDuplicates,
        errors
      };

      setImportResult(finalResult);

      if (totalInserted > 0 && totalDuplicates > 0) {
        onShowToast(`${totalInserted} novos leads importados e ${totalDuplicates} atualizados!`);
      } else if (totalInserted > 0) {
        onShowToast(`${totalInserted} novos leads importados do ZIP!`);
      } else if (totalDuplicates > 0) {
        onShowToast(`${totalDuplicates} leads atualizados com dados do ZIP!`);
      } else {
        onShowToast('Nenhum lead novo foi encontrado no arquivo ZIP.');
      }

      onImportComplete();
    } catch (err: any) {
      console.error('Browser ZIP processing failed, falling back:', err);
      try {
        setProgressMessage('Enviando via servidor...');
        const formData = new FormData();
        formData.append('zipFile', selectedFile);
        const res = await fetch('/api/upload-zip', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) {
          setImportResult(data);
          onImportComplete();
        } else {
          onShowToast(data.error || 'Erro ao processar o arquivo ZIP.');
        }
      } catch (fallbackErr: any) {
        onShowToast(`Erro ao processar ZIP: ${err.message || fallbackErr.message}`);
      }
    } finally {
      setIsUploading(false);
      setProgressMessage('');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-xl border border-neutral-200 max-w-lg w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 p-1 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 rounded-lg bg-neutral-100 text-neutral-800">
            <FileArchive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900">
              Importar Leads via .ZIP
            </h3>
            <p className="text-xs text-neutral-500">
              Varredura recursiva de arquivos JSON em subpastas
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
              selectedFile
                ? 'border-neutral-400 bg-neutral-50'
                : 'border-neutral-300 hover:border-neutral-400 bg-white'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex flex-col items-center">
                <FileCheck className="w-8 h-8 text-emerald-600 mb-2" />
                <span className="text-xs font-semibold text-neutral-800 max-w-xs truncate">
                  {selectedFile.name}
                </span>
                <span className="text-[11px] text-neutral-400 mt-0.5">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Clique para trocar
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                <span className="text-xs font-medium text-neutral-700">
                  Arraste e solte o arquivo .ZIP aqui
                </span>
                <span className="text-[11px] text-neutral-400 mt-1">
                  ou clique para navegar nos seus arquivos
                </span>
              </div>
            )}
          </div>

          {/* Info das Regras do JSON */}
          <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-xs text-neutral-600 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-neutral-800 mb-1">
              <Info className="w-3.5 h-3.5 text-neutral-500" />
              Mapeamento Automático dos Campos do JSON:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-neutral-500 pl-1">
              <li><strong>ID do Lead:</strong> campo <code className="bg-neutral-200/60 px-1 rounded">"id"</code></li>
              <li><strong>Nome do Lead:</strong> campo <code className="bg-neutral-200/60 px-1 rounded">"name"</code></li>
              <li><strong>Telefone:</strong> campo <code className="bg-neutral-200/60 px-1 rounded">"phoneNumber"</code></li>
              <li><strong>Link do Site:</strong> <code className="bg-neutral-200/60 px-1 rounded">"dithoSitesMetadata.publicUrl"</code></li>
            </ul>
            <p className="text-[10px] text-neutral-400 pt-1">
              * O sistema busca recursivamente em todas as subpastas e ignora IDs já existentes no banco.
            </p>
          </div>

          {/* Progress Message */}
          {isUploading && progressMessage && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-xs text-blue-800 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
              <span>{progressMessage}</span>
            </div>
          )}

          {/* Resultado da Importação */}
          {importResult && (
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs text-emerald-800 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Importação Concluída com Sucesso!
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="bg-white/80 p-1.5 rounded border border-emerald-100">
                  <span className="block text-[10px] text-emerald-600">JSONs Encontrados</span>
                  <span className="font-semibold text-sm">{importResult.totalProcessed}</span>
                </div>
                <div className="bg-white/80 p-1.5 rounded border border-emerald-100">
                  <span className="block text-[10px] text-emerald-600">Novos Leads</span>
                  <span className="font-semibold text-sm text-emerald-700">+{importResult.insertedCount}</span>
                </div>
                <div className="bg-white/80 p-1.5 rounded border border-emerald-100">
                  <span className="block text-[10px] text-emerald-600">Atualizados / Duplicados</span>
                  <span className="font-semibold text-sm text-neutral-600">{importResult.skippedDuplicates}</span>
                </div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-2 pt-2 border-t border-emerald-200/60 text-[11px] text-amber-800">
                  <span className="font-semibold block mb-1">Avisos ao ler alguns arquivos:</span>
                  <ul className="list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto">
                    {importResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
          >
            {importResult ? 'Fechar' : 'Cancelar'}
          </button>
          <button
            onClick={handleUploadZip}
            disabled={!selectedFile || isUploading}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Processando ZIP...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                Iniciar Processamento
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
