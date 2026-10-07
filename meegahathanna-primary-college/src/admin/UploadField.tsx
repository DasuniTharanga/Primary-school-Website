import { useState } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { api, messageOf } from '@/lib/api';
import { Alert } from '@/components/ui';

export default function UploadField({
  label,
  value,
  onChange,
  pdf = false,
  onBusyChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  pdf?: boolean;
  onBusyChange?: (v: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function upload(file: File) {
    setBusy(true);
    onBusyChange?.(true);
    setError('');
    try {
      if (file.size > (pdf ? 5 : 4) * 1024 * 1024)
        throw new Error(`Choose a file smaller than ${pdf ? 5 : 4} MB.`);
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(new Error('Cannot read this file.'));
        reader.readAsDataURL(file);
      });
      const result = await api<{ path: string }>('/api/admin/media', {
        method: 'POST',
        body: { fileName: file.name, base64 },
      });
      if (pdf ? !result.path.endsWith('.pdf') : !result.path.endsWith('.webp'))
        throw new Error(`Please choose ${pdf ? 'a PDF' : 'an image'} for this field.`);
      onChange(result.path);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return (
    <div className="upload-field">
      <span className="field-title">{label}</span>
      {value && (
        <div className="upload-preview">
          {pdf ? (
            <a href={value} target="_blank" rel="noreferrer">
              <FileText size={20} />
              View uploaded PDF
            </a>
          ) : (
            <img src={value} alt="Uploaded preview" />
          )}
          <button
            type="button"
            className="icon-button"
            onClick={() => onChange('')}
            aria-label={`Remove ${label}`}
          >
            <X size={17} />
          </button>
        </div>
      )}
      <label className="upload-picker">
        <Upload size={19} />
        {busy ? 'Uploading…' : value ? 'Change file' : 'Choose file'}
        <input
          type="file"
          accept={pdf ? 'application/pdf' : '.jpg,.jpeg,.png,.webp'}
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = '';
          }}
        />
      </label>
      <small>
        {pdf
          ? 'PDF, up to 5 MB.'
          : 'JPG, PNG or WebP, up to 4 MB. Images are optimised and location metadata is removed.'}
      </small>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
