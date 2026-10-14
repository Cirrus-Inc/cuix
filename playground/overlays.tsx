import { Copy, Filter, Info, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogClose,
  Drawer,
  Field,
  IconButton,
  Input,
  Menu,
  Popover,
  Sheet,
  Tooltip,
} from '../src/react/index.ts';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-h`} className="rounded-card border border-border bg-surface p-4">
      <h2 id={`${id}-h`} className="mb-4 text-heading">
        {title}
      </h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

export function Overlays() {
  const [dialog, setDialog] = useState(false);
  const [nested, setNested] = useState(false);
  const [third, setThird] = useState(false);
  const [guarded, setGuarded] = useState(false);
  const [sheetA, setSheetA] = useState(false);
  const [sheetB, setSheetB] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [lastMenu, setLastMenu] = useState('');
  return (
    <>
      <Section id="dialog" title="Dialog">
        <Button data-testid="open-dialog" onClick={() => setDialog(true)}>
          Edit profile
        </Button>
        <Button data-testid="open-guarded" variant="secondary" onClick={() => setGuarded(true)}>
          Unsaved input
        </Button>
        <Dialog
          open={dialog}
          onOpenChange={setDialog}
          title="Edit profile"
          description="Changes apply to every workspace."
          footer={
            <>
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button onClick={() => setNested(true)}>Save</Button>
            </>
          }
        >
          <Field label="Display name">
            <Input autoComplete="nickname" defaultValue="Ana" />
          </Field>
          <Dialog
            open={nested}
            onOpenChange={setNested}
            title="Confirm save"
            size="sm"
            footer={
              <>
                <DialogClose asChild>
                  <Button variant="secondary">Back</Button>
                </DialogClose>
                <Button
                  onClick={() => {
                    setNested(false);
                    setDialog(false);
                  }}
                >
                  Confirm
                </Button>
              </>
            }
          >
            <p className="text-body">Save the new name?</p>
            <Button data-testid="open-third" variant="secondary" onClick={() => setThird(true)}>
              Too deep
            </Button>
            <Dialog open={third} onOpenChange={setThird} title="Third level" size="sm">
              <p className="text-body">Not supported, but it must not crash.</p>
            </Dialog>
          </Dialog>
        </Dialog>
        <Dialog
          open={guarded}
          onOpenChange={setGuarded}
          title="New note"
          dismissOnOverlay={false}
          footer={
            <>
              <DialogClose asChild>
                <Button variant="secondary">Discard</Button>
              </DialogClose>
              <Button onClick={() => setGuarded(false)}>Save note</Button>
            </>
          }
        >
          <Field label="Note">
            <Input autoComplete="off" defaultValue="Draft" />
          </Field>
        </Dialog>
      </Section>

      <Section id="sheet" title="Sheet · Drawer">
        <Button data-testid="open-sheet-a" variant="secondary" onClick={() => setSheetA(true)}>
          Contact
        </Button>
        <Button data-testid="open-sheet-b" variant="secondary" onClick={() => setSheetB(true)}>
          Activity
        </Button>
        <Button data-testid="open-drawer" variant="secondary" onClick={() => setDrawer(true)}>
          Menu
        </Button>
        <Sheet open={sheetA} onOpenChange={setSheetA} title="Contact" description="Ana Pérez">
          <p className="text-body">Details.</p>
        </Sheet>
        <Sheet open={sheetB} onOpenChange={setSheetB} title="Activity" modal={false} footer={<Button onClick={() => setSheetB(false)}>Done</Button>}>
          <p className="text-body">Timeline.</p>
        </Sheet>
        <Drawer open={drawer} onOpenChange={setDrawer} title="Menu">
          {['Home', 'Contacts', 'Reports'].map((item) => (
            <a key={item} href="#main" className="flex min-h-target items-center rounded-control px-3 text-body hover:bg-surface-raised">
              {item}
            </a>
          ))}
        </Drawer>
      </Section>

      <Section id="tooltip" title="Tooltip · Menu · Popover">
        <Tooltip content="Copy the link">
          <IconButton data-testid="tooltip-trigger" icon={<Copy aria-hidden="true" />} aria-label="Copy link" />
        </Tooltip>
        <Menu
          label="Actions"
          trigger={<IconButton data-testid="open-menu" icon={<MoreVertical aria-hidden="true" />} aria-label="More actions" />}
          items={[
            { label: 'Rename', icon: <Pencil aria-hidden="true" />, onSelect: () => setLastMenu('rename') },
            { id: 'duplicate item', label: 'Duplicate', icon: <Copy aria-hidden="true" />, onSelect: () => setLastMenu('duplicate'), disabled: true, disabledReason: 'Plan limit reached' },
            { type: 'separator' },
            { label: 'Delete', icon: <Trash2 aria-hidden="true" />, onSelect: () => setLastMenu('delete'), destructive: true },
          ]}
        />
        <span data-testid="last-menu" className="text-body-sm text-foreground-muted">
          {lastMenu || 'nothing selected'}
        </span>
        <Popover
          title="Filters"
          trigger={
            <Button data-testid="open-popover" variant="secondary" icon={<Filter aria-hidden="true" />}>
              Filter
            </Button>
          }
        >
          <Field label="Owner">
            <Input autoComplete="off" />
          </Field>
          <p className="flex items-center gap-2 text-body-sm text-foreground-muted">
            <Info aria-hidden="true" /> Applies on close.
          </p>
        </Popover>
      </Section>
    </>
  );
}
