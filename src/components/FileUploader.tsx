import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { ControllerRenderProps } from 'react-hook-form';
import { trpc } from '@/hooks/trpcProvider';
import { Input } from '@/components/ui/input';

interface FileUploaderProps {
  field: ControllerRenderProps<any, any>;
  uploadFolder: string; // Allow any folder name as a string
  accept?: Record<string, string[]>; // Ensure accept is properly typed
  maxSize?: number;
  className?: string;
  label?: string;
}

export function FileUploader({
  field,
  uploadFolder,
  accept = {
    'image/*': ['.jpeg', '.jpg', '.png'],
    'application/pdf': ['.pdf'],
  },
  maxSize = 5 * 1024 * 1024,
  className,
  label = 'Click or drag files to upload',
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadMutation = trpc.upload.getPresignedUrl.useMutation();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      try {
        setIsUploading(true);
        setError(null);

        const { uploadUrl, key } = await uploadMutation.mutateAsync({
          fileName: file.name,
          fileType: file.type,
          uploadFolder,
        });

        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        const fullUrl = `https://trainer-db.s3.us-east-2.amazonaws.com/${key}`;

        // Update the field value using React Hook Form's field.onChange
        field.onChange(fullUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        console.error('Upload error:', err);
      } finally {
        setIsUploading(false);
      }
    },
    [uploadMutation, uploadFolder, field]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
  });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          'flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:bg-gray-50',
          isUploading && 'bg-gray-50 cursor-not-allowed',
          className
        )}
      >
        <Input {...getInputProps()} disabled={isUploading} />
        <div className="flex items-center gap-2">
          {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
          <span className="text-base text-gray-900">
            {isUploading ? 'Uploading...' : label}
          </span>
        </div>
        {field.value && (
          <p className="mt-2 text-sm text-gray-600">
            Current file: {field.value}
          </p>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
