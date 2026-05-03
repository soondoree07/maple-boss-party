// backup.js — 전체 데이터 JSON 내보내기 / 불러오기

import * as Storage from './storage.js';
import { todayStr } from './utils.js';

/** 현재 데이터를 다운로드 받음. */
export function exportToFile() {
  const data = Storage.exportData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `maple-boss-backup-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * 파일 → Storage 덮어쓰기.
 *
 * @param {File} file
 * @param {(data) => void} onSuccess
 * @param {(err: Error) => void} onError
 */
export function importFromFile(file, onSuccess, onError) {
  if (!file) {
    onError?.(new Error('파일이 없어요'));
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      Storage.importData(data);
      onSuccess?.(data);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };
  reader.onerror = () => onError?.(new Error('파일을 읽지 못했어요'));
  reader.readAsText(file);
}
