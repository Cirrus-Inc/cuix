import { ArrowRight, BarChart3, ExternalLink, Inbox, LayoutGrid, List, PanelRight, Plus, Save, Search, Settings, Trash2, Users } from 'lucide-react';
import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AppShell,
  AppShellPane,
  BottomTab,
  BottomTabs,
  Button,
  Checkbox,
  Field,
  Input,
  RadioGroup,
  SegmentedControl,
  Sidebar,
  SidebarItem,
  SidebarSection,
  SidebarToggle,
  NativeSelect,
  Select,
  Switch,
  Textarea,
  IconButton,
  IconProvider,
  LinkButton,
  ThemeProvider,
  ThemeSwitcher,
  THEME_NAMES,
  ToastProvider,
  TooltipProvider,
  useDocumentTitle,
  useStoredBoolean,
  type ButtonVariant,
} from '../src/react/index.ts';
import { Content } from './content.tsx';
import { Overlays } from './overlays.tsx';
import './app.css';

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger', 'danger-outline', 'link'];
const dense = new URLSearchParams(location.search).get('density') === 'dense';
// The tab bar covers the bottom of the viewport, so the default audits run without it.
const showTabs = new URLSearchParams(location.search).get('tabs') === '1';

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

function Forms() {
  const [notify, setNotify] = useState(true);
  const [plan, setPlan] = useState<string | undefined>('team');
  const [view, setView] = useState<'list' | 'grid' | 'board'>('list');
  return (
    <section aria-labelledby="forms-h" className="rounded-card border border-border bg-surface p-4">
      <h2 id="forms-h" className="mb-4 text-heading">
        Forms
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Email" hint="We only use it for sign-in links." required>
          <Input type="email" autoComplete="email" defaultValue="ana@example.com" />
        </Field>
        <Field label="Company" error="Enter the company name.">
          <Input autoComplete="organization" data-testid="invalid-input" />
        </Field>
        <Field label="Phone">
          <Input id="phone-own-id" type="tel" autoComplete="tel" />
        </Field>
        <Field label="Search">
          <Input type="search" icon={<Search />} placeholder="Name or email" autoComplete="off" />
        </Field>
        <Field label="Country" hint="Where invoices are issued.">
          <Select
            autoComplete="country-name"
            defaultValue="ar"
            options={[
              { value: 'ar', label: 'Argentina' },
              { value: 'br', label: 'Brazil', disabled: true },
              { value: 'us', label: 'United States' },
            ]}
          />
        </Field>
        <Field label="Region" error="Pick a region.">
          <Select
            placeholder="Choose a region"
            options={[
              { value: 'na', label: 'North America' },
              { value: 'sa', label: 'South America' },
            ]}
          />
        </Field>
        <Field label="Language">
          <NativeSelect defaultValue="es">
            <option value="es">Español</option>
            <option value="en">English</option>
          </NativeSelect>
        </Field>
        <Field label="Notes" hint="Visible to your team only.">
          <Textarea />
        </Field>
        <Field label="Account ID">
          <Input readOnly defaultValue="acct_1042" />
        </Field>
        <Field label="Disabled field">
          <Input disabled defaultValue="Locked" />
        </Field>
        <div className="flex flex-col gap-2">
          <Checkbox label="Send me product updates" hint="About once a month." defaultChecked />
          <Checkbox label="Accept the terms" error="You need to accept the terms." />
          <Checkbox label="Disabled option" disabled />
        </div>
        <div className="flex flex-col gap-2">
          <Switch label="Email notifications" checked={notify} onCheckedChange={setNotify} hint="Applies immediately." />
          <Switch label="Locked setting" checked={false} onCheckedChange={() => {}} disabled />
        </div>
        <RadioGroup
          legend="Plan"
          name="plan"
          value={plan}
          onValueChange={setPlan}
          required
          options={[
            { value: 'solo', label: 'Solo' },
            { value: 'team', label: 'Team' },
            { value: 'enterprise', label: 'Enterprise', disabled: true },
          ]}
        />
        <SegmentedControl
          label="View"
          name="view"
          value={view}
          onValueChange={setView}
          segments={[
            { value: 'list', label: 'List', icon: <List aria-hidden="true" /> },
            { value: 'grid', label: 'Grid', icon: <LayoutGrid aria-hidden="true" /> },
            { value: 'board', label: 'Board' },
          ]}
        />
      </div>
    </section>
  );
}

function Playground() {
  useDocumentTitle('Playground', 'cuix');
  const [collapsed, setCollapsed] = useStoredBoolean('cuix.playground.sidebar', false);
  // Demo-only state: an app owns this and passes `pane` only while open.
  const [paneOpen, setPaneOpen] = useState(false);
  const paneToggle = useRef<HTMLButtonElement>(null);
  return (
    <AppShell
      collapsed={collapsed}
      pane={
        paneOpen ? (
          <AppShellPane
            title="Details"
            onClose={() => {
              setPaneOpen(false);
              paneToggle.current?.focus();
            }}
          >
            <p>Selected record notes.</p>
          </AppShellPane>
        ) : undefined
      }
      tabs={
        showTabs ? (
        <BottomTabs>
          <BottomTab href="#inbox" icon={<Inbox />} label="Inbox" current />
          <BottomTab href="#contacts" icon={<Users />} label="Contacts" />
          <BottomTab href="#reports" icon={<BarChart3 />} label="Reports" />
          <BottomTab href="#settings" icon={<Settings />} label="Settings" />
        </BottomTabs>
        ) : undefined
      }
      sidebar={
        <Sidebar
          footer={<SidebarToggle collapsed={collapsed} onCollapsedChange={setCollapsed} />}
        >
          <SidebarSection>
            <SidebarItem href="#inbox" icon={<Inbox />} label="Inbox" count={3} current />
            <SidebarItem href="#contacts" icon={<Users />} label="Contacts" />
            <SidebarItem href="#reports" icon={<BarChart3 />} label="Reports" />
          </SidebarSection>
          <SidebarSection label="Account">
            <SidebarItem href="#settings" icon={<Settings />} label="Settings" />
          </SidebarSection>
        </Sidebar>
      }
      header={
        <>
          <span className="text-subheading">cuix</span>
          <ThemeSwitcher themes={THEME_NAMES} className="ml-auto" />
          {/* The pane exists from lg up only, so its toggle does too. */}
          <div className="hidden lg:block">
            <IconButton
              ref={paneToggle}
              icon={<PanelRight aria-hidden="true" />}
              aria-label="Details panel"
              aria-controls="pane"
              aria-expanded={paneOpen}
              onClick={() => setPaneOpen(!paneOpen)}
            />
          </div>
        </>
      }
    >
      <div data-density={dense ? 'dense' : undefined} className="mx-auto flex max-w-5xl flex-col gap-6 p-4">
        <h1 className="text-title">Playground</h1>
        <Forms />
        <Overlays />
        <Content />
        {VARIANTS.map((v) => (
          <Section key={v} id={`button-${v}`} title={`Button · ${v}`}>
            <Button variant={v}>Save</Button>
            <Button variant={v} icon={<Save aria-hidden="true" />}>
              Save
            </Button>
            <Button variant={v} size="lg">
              Large
            </Button>
            <Button variant={v} loading>
              Saving
            </Button>
            <Button variant={v} icon={<Save aria-hidden="true" />} loading>
              Saving
            </Button>
            <Button variant={v} disabled disabledReason="Fill in the name first">
              Disabled
            </Button>
          </Section>
        ))}
        <Section id="icon-button" title="IconButton">
          <IconButton icon={<Settings aria-hidden="true" />} aria-label="Settings" />
          <IconButton icon={<Plus aria-hidden="true" />} aria-label="Add" variant="primary" />
          <IconButton icon={<Trash2 aria-hidden="true" />} aria-label="Delete" variant="danger" size="lg" />
          <IconButton icon={<Plus aria-hidden="true" />} aria-label="Add (disabled)" disabled disabledReason="No permission" />
        </Section>
        <Section id="link-button" title="LinkButton">
          <LinkButton href="#main" trailingIcon={<ArrowRight aria-hidden="true" />}>
            Continue
          </LinkButton>
          <LinkButton href="https://example.com" variant="link" trailingIcon={<ExternalLink aria-hidden="true" />}>
            Docs
          </LinkButton>
        </Section>
        <Section id="click-target" title="Behaviour">
          <Button data-testid="width-idle">Publish</Button>
          <Button data-testid="width-busy" loading>
            Publish
          </Button>
          <Button data-testid="width-idle-trailing" trailingIcon={<ArrowRight aria-hidden="true" />}>
            Next
          </Button>
          <Button data-testid="width-busy-trailing" trailingIcon={<ArrowRight aria-hidden="true" />} loading>
            Next
          </Button>
          <Button data-testid="counter" onClick={(e) => (e.currentTarget.dataset.clicks = String(Number(e.currentTarget.dataset.clicks ?? 0) + 1))}>
            Count
          </Button>
          <Button
            data-testid="disabled-counter"
            disabled
            disabledReason="Locked"
            onClick={(e) => (e.currentTarget.dataset.clicks = String(Number(e.currentTarget.dataset.clicks ?? 0) + 1))}
          >
            Locked
          </Button>
        </Section>
      </div>
    </AppShell>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <IconProvider>
        <TooltipProvider>
          <ToastProvider>
            <Playground />
          </ToastProvider>
        </TooltipProvider>
      </IconProvider>
    </ThemeProvider>
  </StrictMode>,
);
