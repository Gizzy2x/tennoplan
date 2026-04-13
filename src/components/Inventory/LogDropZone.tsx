import React, { useState } from 'react';
import { LogParserService } from '../../services/LogParserService';

export const LogDropZone = () => {
  const [status, setStatus] = useState<'idle' | 'parsing' | 'success'>('idle');

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    setStatus('parsing');
    const text = await file.text();
    const items = LogParserService.parseLog(text);
    await LogParserService.syncInventoryToDb(items);

    setStatus('success');
    setTimeout(() => setStatus('idle'), 3000);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleFileDrop}
      className={`border-2 border-dashed p-8 rounded-lg text-center transition-all ${
        status === 'success'
          ? 'border-green-500 bg-green-900/20'
          : 'border-gray-600 hover:border-blue-400'
      }`}
    >
      {status === 'idle' && <p>Drag and Drop your <b>EE.log</b> here to sync inventory</p>}
      {status === 'parsing' && <p className="animate-pulse">Scanning Warehouse Log...</p>}
      {status === 'success' && <p>✓ Inventory Updated! Database Refreshed.</p>}
    </div>
  );
};
