import { FoliolineEditor, type FoliolineOptions } from '@folioline/react';
import { connectShell } from '@folioline/web-shared/shell';

export function App({ options }: { options: FoliolineOptions }) {
  return <FoliolineEditor {...options} onReady={connectShell} />;
}
