import { Inbox, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, ConfirmInline, EmptyState, IconButton, ToastLog, useToast } from '../src/react/index.ts';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-h`} className="rounded-card border border-border bg-surface p-4">
      <h2 id={`${id}-h`} className="mb-4 text-heading">
        {title}
      </h2>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </section>
  );
}

export function Content() {
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [deleted, setDeleted] = useState(false);
  // Keep backs out to the trigger: ConfirmInline replaced it, so focus is the caller's to return.
  const trigger = useRef<HTMLButtonElement>(null);
  const backedOut = useRef(false);
  useEffect(() => {
    if (!confirming && backedOut.current) {
      backedOut.current = false;
      trigger.current?.focus();
    }
  }, [confirming]);
  return (
    <>
      <Section id="card" title="Card">
        <Card title="Invoice #1042" action={<IconButton icon={<Pencil aria-hidden="true" />} aria-label="Edit invoice" />} footer={<Badge tone="success">Paid</Badge>} className="w-full sm:w-dialog-sm">
          <p className="text-body">Due 30 days after issue.</p>
        </Card>
        <Card title="Plan summary" headingLevel={2} className="w-full sm:w-dialog-sm">
          <p className="text-body">Team plan, billed monthly.</p>
        </Card>
        <Card rail="warning" className="w-full sm:w-dialog-sm">
          <p className="text-body">Unanswered for 5 days.</p>
        </Card>
        <Card elevation="raised" pad="none" className="w-full sm:w-dialog-sm">
          <ul className="divide-y divide-border">
            {['Ana', 'Luis'].map((n) => (
              <li key={n} className="flex min-h-target items-center px-4 text-body">
                {n}
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      <Section id="badge" title="Badge">
        <Badge>Draft</Badge>
        <Badge tone="accent">Selected</Badge>
        <Badge tone="success">Paid</Badge>
        <Badge tone="warning">Overdue</Badge>
        <Badge tone="danger">Failed</Badge>
        <Badge tone="info">Scheduled</Badge>
        <Badge filled>Draft</Badge>
        <Badge tone="accent" filled>
          Selected
        </Badge>
        <Badge tone="success" filled>
          Paid
        </Badge>
        <Badge tone="warning" filled>
          Overdue
        </Badge>
        <Badge tone="danger" filled>
          Failed
        </Badge>
        <Badge tone="info" filled>
          Scheduled
        </Badge>
      </Section>

      <Section id="empty" title="EmptyState">
        <EmptyState
          icon={<Inbox />}
          title="No entries this week"
          description="Entries appear here as you log time; start one with the timer."
          action={<Button>Start timer</Button>}
          className="w-full sm:w-dialog-sm"
        />
        <EmptyState tone="error" title="Could not load entries" description="Check the connection and try again." action={<Button variant="secondary">Retry</Button>} className="w-full sm:w-dialog-sm" />
      </Section>

      <Section id="confirm" title="ConfirmInline">
        {deleted ? (
          <span data-testid="deleted" className="text-body text-foreground-muted">
            Entry deleted.
          </span>
        ) : confirming ? (
          <ConfirmInline
            question="Delete this entry?"
            confirmLabel="Delete"
            onConfirm={() => {
              setDeleted(true);
              setConfirming(false);
            }}
            onCancel={() => {
              backedOut.current = true;
              setConfirming(false);
            }}
          />
        ) : (
          <Button ref={trigger} data-testid="delete" variant="danger-outline" icon={<Trash2 aria-hidden="true" />} onClick={() => setConfirming(true)}>
            Delete entry
          </Button>
        )}
      </Section>

      <Section id="toast" title="Toast">
        <Button data-testid="toast-success" variant="secondary" onClick={() => toast('Entry saved.', { type: 'success' })}>
          Success
        </Button>
        <Button data-testid="toast-error" variant="secondary" onClick={() => toast('Could not save the entry.', { type: 'error' })}>
          Error
        </Button>
        <Button data-testid="toast-warning" variant="secondary" onClick={() => toast('Timer still running.', { type: 'warning' })}>
          Warning
        </Button>
        <Button data-testid="toast-undo" variant="secondary" onClick={() => toast('Entry deleted.', { type: 'info', action: { label: 'Undo', run: () => toast('Entry restored.', { type: 'success' }) } })}>
          With action
        </Button>
        <div className="w-full">
          <h3 className="mb-2 text-subheading">Log</h3>
          <div data-testid="toast-log">
            <ToastLog />
          </div>
        </div>
      </Section>
    </>
  );
}
