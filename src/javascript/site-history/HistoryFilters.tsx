import {
  AddPerson,
  Button,
  CheckboxChecked,
  CheckboxUnchecked,
  DateTimeInput,
  FolderOpen,
  Input,
  MenuItem,
  Typography,
  type Temporal,
} from "@jahia/moonstone";
import type { ColumnFiltersState, VisibilityState } from "@tanstack/react-table";
import { useEffect, useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACE } from "../i18n.ts";
import { AddFilter } from "./AddFilter.tsx";
import { ColumnChoice } from "./ColumnChoice.tsx";
import { ACTION_CONFIG } from "./columns.tsx";
import { FilterChip, type ChipState, type FilterId } from "./FilterChip.tsx";
import { filterValue, parseUserKeys, type DateRange } from "./filters.ts";
import { formatDay } from "./formatDate.ts";
import styles from "./SiteHistoryApp.module.css";

type SetFilter = (id: string, value: unknown) => void;

/** The filters that Add filter puts in the row. Date and Path are always in the row. */
const ADDABLE_FILTERS: ReadonlyArray<FilterId> = ["user", "action"];

// The moonstone typings drop the null that DateTimeInput emits when the user clears the field.
const toDay = (value: Temporal.PlainDate | null): string => value?.toString() ?? "";

type PickerButtonProps = Readonly<{ icon: ReactElement; label: string; role: string; onClick: () => void }>;

const PickerButton = ({ icon, label, role, onClick }: PickerButtonProps) => (
    <Button variant="outlined" icon={icon} label={label} data-sel-role={role} onClick={onClick}/>
);

type TypedEditorProps = Readonly<{ hint: string; picker?: ReactElement; children: ReactElement }>;

/** The editor of a filter that takes a typed value or a picker choice. */
const TypedEditor = ({ hint, picker, children }: TypedEditorProps) => (
    <div className={`${styles.editorBody} ${styles.typedEditor}`}>
        {children}
        <Typography variant="caption" className={styles.secondary}>
            {hint}
        </Typography>
        {picker}
    </div>
);

type PathFilterProps = ChipState & Readonly<{
  filters: ColumnFiltersState;
  siteKey: string;
  sitePath: string;
  language: string;
  onChange: SetFilter;
}>;

const PathFilter = ({ filters, siteKey, sitePath, language, onChange, onClose, ...chip }: PathFilterProps) => {
  const { t } = useTranslation(NAMESPACE);
  const openPicker = globalThis.CE_API?.openPicker;
  const path = filterValue<string>(filters, "path") ?? "";
  const [draft, setDraft] = useState(path);
  useEffect(() => setDraft(path), [path]);

  const commit = (value: string) => {
    if (value.trim() !== path) {
      onChange("path", value.trim());
    }
  };

  // The picker dialog opens below the editor Menu, so the editor closes first.
  // A filter change returns the table to page 1, so the picked path that is already the filter changes nothing.
  const pick = (closeEditor: () => void) => {
    const current = draft.trim();
    closeEditor();
    openPicker?.({
      type: "editorial",
      site: siteKey,
      lang: language,
      setValue: ([node]) => node && node.path !== current && onChange("path", node.path),
    });
  };

  return (
      <FilterChip
      {...chip}
      id="path"
      name={t("siteHistory.columns.path")}
      value={path}
      onClose={() => {
        commit(draft);
        onClose();
      }}
      onClear={() => onChange("path", "")}
      >
          {closeEditor => (
              <TypedEditor
          hint={t("siteHistory.filters.pathHint")}
          picker={
            openPicker && (
            <PickerButton
              icon={<FolderOpen/>}
              label={t("siteHistory.filters.pickPath")}
              role="filter-path-picker"
              onClick={() => pick(closeEditor)}
            />
            )
          }
              >
                  <Input
            value={draft}
            placeholder={t("siteHistory.filters.path", { example: `${sitePath}/home`, interpolation: { escapeValue: false } })}
            aria-label={t("siteHistory.columns.path")}
            data-sel-role="filter-path"
            onChange={event => setDraft(event.target.value)}
            onKeyUp={event => {
              if (event.key === "Enter") {
                commit(draft);
              }
            }}
            onBlur={() => commit(draft)}
            onClear={() => {
              setDraft("");
              commit("");
            }}
          />
              </TypedEditor>
      )}
      </FilterChip>
  );
};

export type PickedUser = Readonly<{ name: string; uuid: string; path: string }>;

type UserFilterProps = ChipState & Readonly<{
  filters: ColumnFiltersState;
  pickedUsers: PickedUser[];
  siteKey: string;
  language: string;
  onChange: SetFilter;
  onPick: (users: PickedUser[]) => void;
}>;

const UserFilter = ({ filters, pickedUsers, siteKey, language, onChange, onPick, onClose, ...chip }: UserFilterProps) => {
  const { t } = useTranslation(NAMESPACE);
  const openPicker = globalThis.CE_API?.openPicker;
  const userKeys = filterValue<string[]>(filters, "user") ?? [];
  // The effect depends on the text, because a missing filter gives a new empty array on every render.
  const text = userKeys.join(", ");
  const [draft, setDraft] = useState(text);
  useEffect(() => setDraft(text), [text]);

  const commit = (keys: string[]) => {
    setDraft(keys.join(", "));
    if (keys.join(", ") !== text) {
      onChange("user", keys);
    }
  };

  // The picker dialog opens below the editor Menu, so the editor closes first and commits the typed keys.
  const pick = (closeEditor: () => void) => {
    const keys = parseUserKeys(draft);
    closeEditor();
    // A typed key has no node, so the picker preselects only the users that it returned before.
    const preselected = pickedUsers.filter(user => keys.includes(user.name));
    openPicker?.({
      type: "user",
      site: siteKey,
      lang: language,
      isMultiple: true,
      value: preselected.map(({ uuid, path }) => ({ uuid, path })),
      setValue: nodes => {
        onPick(nodes.map(({ name, uuid, path }) => ({ name, uuid, path })));
        // The picked users replace the preselected users, so a user unselected in the picker leaves the list.
        const typed = keys.filter(key => !preselected.some(user => user.name === key));
        const picked = [...new Set([...typed, ...nodes.map(node => node.name)])];
        // A filter change returns the table to page 1, so the same users change nothing.
        if (picked.join(", ") !== keys.join(", ")) {
          onChange("user", picked);
        }
      },
    });
  };

  return (
      <FilterChip
      {...chip}
      id="user"
      name={t("siteHistory.columns.user")}
      value={text}
      onClose={() => {
        commit(parseUserKeys(draft));
        onClose();
      }}
      onClear={() => onChange("user", [])}
      >
          {closeEditor => (
              <TypedEditor
          hint={t("siteHistory.filters.userHint")}
          picker={
            openPicker && (
            <PickerButton
              icon={<AddPerson/>}
              label={t("siteHistory.filters.pickUsers")}
              role="filter-user-picker"
              onClick={() => pick(closeEditor)}
            />
            )
          }
              >
                  <Input
            value={draft}
            placeholder={t("siteHistory.filters.user")}
            aria-label={t("siteHistory.columns.user")}
            data-sel-role="filter-user"
            onChange={event => setDraft(event.target.value)}
            onKeyUp={event => {
              if (event.key === "Enter") {
                commit(parseUserKeys(draft));
              }
            }}
            onBlur={() => commit(parseUserKeys(draft))}
            onClear={() => commit([])}
          />
              </TypedEditor>
      )}
      </FilterChip>
  );
};

type ActionFilterProps = ChipState & Readonly<{ filters: ColumnFiltersState; onChange: SetFilter }>;

const ActionFilter = ({ filters, onChange, ...chip }: ActionFilterProps) => {
  const { t } = useTranslation(NAMESPACE);
  const actions = filterValue<string[]>(filters, "action") ?? [];
  const value = Object.keys(ACTION_CONFIG)
    .filter(action => actions.includes(action))
    .map(action => t(`siteHistory.actions.${action}`))
    .join(", ");

  const toggle = (action: string) =>
    onChange("action", actions.includes(action) ? actions.filter(a => a !== action) : [...actions, action]);

  return (
      <FilterChip {...chip} id="action" name={t("siteHistory.columns.action")} value={value} onClear={() => onChange("action", [])}>
          {Object.keys(ACTION_CONFIG).map(action => {
        const isChecked = actions.includes(action);
        return (
            <MenuItem
            key={action}
            role="menuitemcheckbox"
            aria-checked={isChecked}
            tabIndex={0}
            label={t(`siteHistory.actions.${action}`)}
            iconStart={isChecked ? <CheckboxChecked color="blue"/> : <CheckboxUnchecked/>}
            data-sel-role="filter-action"
            data-sel-action={action}
            onClick={() => toggle(action)}
            onKeyUp={event => {
              if (event.key === "Enter" || event.key === " ") {
                toggle(action);
              }
            }}
          />
        );
      })}
      </FilterChip>
  );
};

type DateFilterProps = ChipState & Readonly<{ filters: ColumnFiltersState; locale: string; onChange: SetFilter }>;

const DateFilter = ({ filters, locale, onChange, ...chip }: DateFilterProps) => {
  const { t } = useTranslation(NAMESPACE);
  const [from, to] = filterValue<DateRange>(filters, "date") ?? ["", ""];
  const calendarLabels = {
    todayButton: t("siteHistory.filters.today"),
    nextMonth: t("siteHistory.filters.nextMonth"),
    previousMonth: t("siteHistory.filters.previousMonth"),
  };
  const days = { from: from && formatDay(from, locale), to: to && formatDay(to, locale) };
  let value = "";
  if (from && to) {
    value = t("siteHistory.filters.dateBetween", days);
  } else if (from) {
    value = t("siteHistory.filters.dateSince", days);
  } else if (to) {
    value = t("siteHistory.filters.dateUntil", days);
  }

  return (
      <FilterChip {...chip} id="date" name={t("siteHistory.columns.date")} value={value} onClear={() => onChange("date", ["", ""])}>
          <div className={`${styles.editorBody} ${styles.dateRange}`}>
              <DateTimeInput
          type="date"
          variant="outlined"
          locale={locale}
          i18n={calendarLabels}
          value={from}
          maxDate={to}
          placeholder={t("siteHistory.filters.dateFrom")}
          aria-label={t("siteHistory.filters.dateFrom")}
          data-sel-role="filter-date-from"
          onChange={(_event, day) => onChange("date", [toDay(day), to])}
        />
              <DateTimeInput
          type="date"
          variant="outlined"
          locale={locale}
          i18n={calendarLabels}
          value={to}
          minDate={from}
          placeholder={t("siteHistory.filters.dateTo")}
          aria-label={t("siteHistory.filters.dateTo")}
          data-sel-role="filter-date-to"
          onChange={(_event, day) => onChange("date", [from, toDay(day)])}
        />
          </div>
      </FilterChip>
  );
};

type HistoryFiltersProps = Readonly<{
  columns: ReadonlyArray<{ key: string; label: string }>;
  columnVisibility: VisibilityState;
  filters: ColumnFiltersState;
  pickedUsers: PickedUser[];
  siteKey: string;
  sitePath: string;
  language: string;
  locale: string;
  onChange: SetFilter;
  onPickUsers: (users: PickedUser[]) => void;
  onColumnVisibilityChange: (visibility: VisibilityState) => void;
}>;

export const HistoryFilters = ({
  columns,
  columnVisibility,
  filters,
  pickedUsers,
  siteKey,
  sitePath,
  language,
  locale,
  onChange,
  onPickUsers,
  onColumnVisibilityChange,
}: HistoryFiltersProps) => {
  const [openFilter, setOpenFilter] = useState<FilterId | null>(null);
  // The User and Action chips keep the order in which the user added them.
  const [addOrder, setAddOrder] = useState<FilterId[]>([]);

  const chip = (id: FilterId): ChipState => ({
    isOpen: openFilter === id,
    onOpen: () => setOpenFilter(id),
    onClose: () => setOpenFilter(null),
  });

  // An added filter stays in the row while it holds a value or while its editor is open.
  const added = [...addOrder, ...ADDABLE_FILTERS.filter(id => !addOrder.includes(id))].filter(
    id => openFilter === id || filters.some(filter => filter.id === id),
  );

  const add = (id: FilterId) => {
    setAddOrder(order => [...order.filter(other => other !== id), id]);
    setOpenFilter(id);
  };

  return (
      <div className={styles.filters} data-sel-role="site-history-filters">
          <DateFilter {...chip("date")} filters={filters} locale={locale} onChange={onChange}/>
          <PathFilter
        {...chip("path")}
        filters={filters}
        siteKey={siteKey}
        sitePath={sitePath}
        language={language}
        onChange={onChange}
      />
          {added.map(id =>
        id === "user" ? (
            <UserFilter
            key={id}
            {...chip(id)}
            filters={filters}
            pickedUsers={pickedUsers}
            siteKey={siteKey}
            language={language}
            onChange={onChange}
            onPick={onPickUsers}
          />
        ) : (
            <ActionFilter key={id} {...chip(id)} filters={filters} onChange={onChange}/>
        ),
      )}
          <AddFilter filters={ADDABLE_FILTERS.filter(id => !added.includes(id))} onAdd={add}/>
          <ColumnChoice columns={columns} visibility={columnVisibility} onChange={onColumnVisibilityChange}/>
      </div>
  );
};
