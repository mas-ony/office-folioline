import { useUI } from './context';
import {
  AboutDialog,
  AltTextDialog,
  BookmarkDialog,
  ImagePropertiesDialog,
  LinkDialog,
  NoteDialog,
  OpenFailureDialog,
  ReportDialog,
  ShortcutsDialog,
  SplitCellDialog,
  TextBoxDialog,
} from './dialogs/MoreDialogs';
import { PageSetupDialog } from './dialogs/PageSetupDialog';
import { ParagraphDialog } from './dialogs/ParagraphDialog';
import { TrackOptionsDialog } from './dialogs/TrackOptionsDialog';
import { WatermarkDialog } from './dialogs/WatermarkDialog';

export function Dialogs() {
  const { modal } = useUI();
  switch (modal) {
    case 'pageSetup': return <PageSetupDialog />;
    case 'paragraph': return <ParagraphDialog />;
    case 'watermark': return <WatermarkDialog />;
    case 'trackOptions': return <TrackOptionsDialog />;
    case 'bookmark': return <BookmarkDialog />;
    case 'imageProps': return <ImagePropertiesDialog />;
    case 'altText': return <AltTextDialog />;
    case 'link': return <LinkDialog />;
    case 'splitCell': return <SplitCellDialog />;
    case 'note': return <NoteDialog />;
    case 'textBox': return <TextBoxDialog />;
    case 'report': return <ReportDialog />;
    case 'shortcuts': return <ShortcutsDialog />;
    case 'about': return <AboutDialog />;
    case 'openFailure': return <OpenFailureDialog />;
    default: return null;
  }
}
