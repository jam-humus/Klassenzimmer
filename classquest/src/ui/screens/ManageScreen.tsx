import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useApp } from '~/app/AppContext';
import type { BadgeDefinition, Category, ID, Quest, QuestType, Student, Team } from '~/types/models';
import AsyncButton from '~/ui/feedback/AsyncButton';
import { useFeedback } from '~/ui/feedback/FeedbackProvider';
import { EVENT_EXPORT_DATA, EVENT_IMPORT_DATA, EVENT_OPEN_SEASON_RESET } from '~/ui/shortcut/events';
import { deleteBlob, getObjectURL, putBlob } from '~/services/blobStore';
import { selectLogsForStudent, selectStudentById } from '~/core/selectors/student';
import StudentDetailScreen from '~/ui/screens/StudentDetailScreen';
import { BadgeIcon } from '~/ui/components/BadgeIcon';

const questTypes: QuestType[] = ['daily', 'repeatable', 'oneoff'];

const describeBadgeRule = (definition: BadgeDefinition, categories: Category[]) => {
  const rule = definition.rule;
  if (!rule) {
    return 'Manuell vergeben';
  }
  if (rule.type === 'total_xp') {
    return `Auto: Gesamt-XP ≥ ${rule.threshold}`;
  }
  if (rule.type === 'category_xp') {
    const targetName =
      (rule.categoryId && categories.find((category) => category.id === rule.categoryId)?.name) ??
      rule.category ??
      'Kategorie';
    return `Auto: ${targetName} ≥ ${rule.threshold} XP`;
  }
  return 'Manuell vergeben';
};

const ACCEPTED_IMAGE_TYPES = new Set(['image/png', 'image/webp', 'image/jpeg', 'image/jpg']);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const STAR_ICON_RECOMMENDED_BYTES = 512 * 1024;
const AVATAR_STAGE_COUNT = 3;

type FeedbackApi = ReturnType<typeof useFeedback>;

const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const getStageKeys = (pack?: Student['avatarPack']): (string | null)[] => {
  const raw = Array.isArray(pack?.stageKeys) ? pack?.stageKeys ?? [] : [];
  return Array.from({ length: AVATAR_STAGE_COUNT }, (_, index) => {
    const value = raw[index];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return null;
  });
};

function useBlobUrl(key: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!key) {
      setUrl(null);
      return;
    }
    (async () => {
      try {
        const objectUrl = await getObjectURL(key);
        if (!cancelled) {
          setUrl(objectUrl ?? null);
        }
      } catch (error) {
        console.warn('Konnte Objekt-URL nicht laden', error);
        if (!cancelled) {
          setUrl(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);
  return url;
}

function validateImageFile(
  file: File,
  feedback: FeedbackApi,
  { context, maxBytes, recommendBytes, recommendMessage }: {
    context: string;
    maxBytes: number;
    recommendBytes?: number;
    recommendMessage?: string;
  },
) {
  const type = (file.type ?? '').toLowerCase();
  if (!ACCEPTED_IMAGE_TYPES.has(type)) {
    feedback.error(`${context}: Bitte PNG oder WebP verwenden (JPEG wird akzeptiert).`);
    return false;
  }
  if (file.size > maxBytes) {
    const maxSizeMb = (maxBytes / (1024 * 1024)).toFixed(1);
    feedback.error(`${context}: Datei ist zu groß (max. ${maxSizeMb} MB).`);
    return false;
  }
  if (type.includes('jpeg') || type.includes('jpg')) {
    feedback.info('JPEG wird unterstützt, aber PNG/WebP wirken besser.');
  }
  if (recommendBytes && file.size > recommendBytes) {
    feedback.info(recommendMessage ?? 'Tipp: Kleinere Dateien laden schneller.');
  }
  return true;
}

type ManageScreenProps = {
  onOpenSeasonReset?: () => void;
};

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function newQuest(
  name: string,
  xp: number,
  type: 'daily' | 'repeatable' | 'oneoff' = 'daily',
): Quest {
  return {
    id: makeId(),
    name: name.trim() || 'Neue Quest',
    xp: Number.isFinite(xp) ? Math.max(0, Math.round(xp)) : 0,
    type,
    target: 'individual',
    active: true,
  };
}

type StudentRowProps = {
  student: Student;
  onSaveAlias: (id: string, alias: string) => void;
  onRemove: (id: string) => Promise<void>;
  onAvatarModeChange: (student: Student, mode: Student['avatarMode']) => void;
  onStageUpload: (student: Student, stageIndex: number, file: File) => Promise<void>;
  onStageRemove: (student: Student, stageIndex: number) => Promise<void>;
  onShowDetail: (id: string) => void;
};

const StudentRow = React.memo(function StudentRow({
  student,
  onSaveAlias,
  onRemove,
  onAvatarModeChange,
  onStageUpload,
  onStageRemove,
  onShowDetail,
}: StudentRowProps) {
  const [value, setValue] = useState(student.alias);
  useEffect(() => setValue(student.alias), [student.alias]);

  const commit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === student.alias) {
      setValue(student.alias);
      return;
    }
    onSaveAlias(student.id, trimmed);
  }, [value, student.alias, student.id, onSaveAlias]);

  const avatarMode = student.avatarMode === 'imagePack' ? 'imagePack' : 'procedural';
  const stageKeys = useMemo(() => getStageKeys(student.avatarPack), [student.avatarPack]);

  return (
    <li
      style={{
        display: 'grid',
        gap: 12,
        padding: 12,
        border: '1px solid #d0d7e6',
        borderRadius: 12,
        background: '#fff',
      }}
    >
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
          aria-label={`Alias für ${student.alias} bearbeiten`}
          style={{ flex: 1, minWidth: 160, padding: '6px 8px', borderRadius: 8, border: '1px solid #d0d7e6' }}
        />
        <AsyncButton
          type="button"
          onClick={commit}
          aria-label={`Alias von ${student.alias} speichern`}
          style={{ padding: '6px 12px' }}
        >
          Speichern
        </AsyncButton>
        <button
          type="button"
          onClick={() => onShowDetail(student.id)}
          aria-label={`Details von ${student.alias} anzeigen`}
          style={{ padding: '6px 12px' }}
        >
          Details
        </button>
        <button
          type="button"
          onClick={() => {
            void onRemove(student.id);
          }}
          aria-label={`${student.alias} entfernen`}
          style={{ padding: '6px 12px' }}
        >
          Entfernen
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <strong>Avatar-Modus:</strong>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="radio"
            name={`avatar-mode-${student.id}`}
            value="procedural"
            checked={avatarMode !== 'imagePack'}
            onChange={() => onAvatarModeChange(student, 'procedural')}
          />
          Procedural
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="radio"
            name={`avatar-mode-${student.id}`}
            value="imagePack"
            checked={avatarMode === 'imagePack'}
            onChange={() => onAvatarModeChange(student, 'imagePack')}
          />
          Bildpaket
        </label>
        <span
          role="img"
          aria-label="Upload-Hinweis"
          title="Transparentes WebP/PNG wirkt am besten."
          style={{ fontSize: 18 }}
        >
          💡
        </span>
      </div>

      {avatarMode === 'imagePack' && (
        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          {stageKeys.map((key, index) => (
            <AvatarStageSlot
              key={index}
              studentAlias={student.alias}
              stageIndex={index}
              blobKey={key}
              onSelectFile={(file) => onStageUpload(student, index, file)}
              onRemove={() => onStageRemove(student, index)}
            />
          ))}
        </div>
      )}
    </li>
  );
});
StudentRow.displayName = 'StudentRow';

type AvatarStageSlotProps = {
  studentAlias: string;
  stageIndex: number;
  blobKey: string | null;
  onSelectFile: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
};

const AvatarStageSlot = ({ studentAlias, stageIndex, blobKey, onSelectFile, onRemove }: AvatarStageSlotProps) => {
  const url = useBlobUrl(blobKey);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const dragCounter = useRef(0);

  const resetInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      void onSelectFile(file);
      resetInput();
    },
    [onSelectFile, resetInput],
  );

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current += 1;
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragCounter.current = 0;
      setDragActive(false);
      const files = event.dataTransfer?.files;
      if (files?.length) {
        handleFiles(files);
      }
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      inputRef.current?.click();
    }
  }, []);

  return (
    <div
      role="group"
      aria-labelledby={`${inputId}-label`}
      tabIndex={0}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      style={{
        border: `2px dashed ${dragActive ? '#3b82f6' : '#cbd5e1'}`,
        borderRadius: 12,
        padding: 12,
        background: dragActive ? '#eff6ff' : '#f8fafc',
        display: 'grid',
        gap: 12,
        outline: 'none',
      }}
    >
      <div id={`${inputId}-label`} style={{ fontWeight: 600 }}>
        Stufe {stageIndex}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 16,
            background: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {url ? (
            <img
              src={url}
              alt={`Avatar-Stufe ${stageIndex} Vorschau für ${studentAlias}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: '0 8px' }}>Kein Bild</span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label htmlFor={inputId} style={srOnly}>{`Avatar Stufe ${stageIndex} Bild wählen`}</label>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/png,image/webp,image/jpeg,image/jpg"
            style={{ display: 'none' }}
            onChange={(event) => handleFiles(event.currentTarget.files)}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" onClick={() => inputRef.current?.click()} aria-label={`Avatar Stufe ${stageIndex} wählen`}>
              Bild wählen
            </button>
            {blobKey && (
              <button
                type="button"
                onClick={() => {
                  void onRemove();
                  resetInput();
                }}
                aria-label={`Avatar Stufe ${stageIndex} entfernen`}
              >
                Entfernen
              </button>
            )}
          </div>
          <span style={{ fontSize: 12, color: '#64748b' }}>Ziehen &amp; ablegen möglich</span>
        </div>
      </div>
    </div>
  );
};

type StarIconUploaderProps = {
  blobKey: string | null;
  onSelect: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
};

const StarIconUploader = ({ blobKey, onSelect, onRemove }: StarIconUploaderProps) => {
  const url = useBlobUrl(blobKey);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const dragCounter = useRef(0);

  const resetInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      void onSelect(file);
      resetInput();
    },
    [onSelect, resetInput],
  );

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current += 1;
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragCounter.current = 0;
      setDragActive(false);
      const files = event.dataTransfer?.files;
      if (files?.length) {
        handleFiles(files);
      }
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      inputRef.current?.click();
    }
  }, []);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{
        border: `2px dashed ${dragActive ? '#3b82f6' : '#cbd5e1'}`,
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: dragActive ? '#eff6ff' : '#f8fafc',
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 18,
          background: '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {url ? (
          <img
            src={url}
            alt="Stern-Icon Vorschau"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <span style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: '0 8px' }}>Kein Bild</span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 200 }}>
        <label htmlFor={inputId} style={srOnly}>Stern-Icon wählen</label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/png,image/webp,image/jpeg,image/jpg"
          style={{ display: 'none' }}
          onChange={(event) => handleFiles(event.currentTarget.files)}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" onClick={() => inputRef.current?.click()} aria-label="Stern-Icon wählen">
            Bild wählen
          </button>
          {blobKey && (
            <button
              type="button"
              onClick={() => {
                void onRemove();
                resetInput();
              }}
              aria-label="Stern-Icon entfernen"
            >
              Entfernen
            </button>
          )}
          <span
            role="img"
            aria-label="Upload-Hinweis"
            title="Transparentes WebP/PNG wirkt am besten."
            style={{ fontSize: 18 }}
          >
            💡
          </span>
        </div>
        <span style={{ fontSize: 12, color: '#64748b' }}>Ziehen &amp; ablegen möglich</span>
      </div>
    </div>
  );
};

type QuestRowProps = {
  quest: Quest;
  categories: Category[];
  onSave: (
    id: string,
    updates: Partial<Pick<Quest, 'name' | 'xp' | 'type' | 'active' | 'category' | 'categoryId'>>,
  ) => void;
  onRemove: (id: string) => void;
};

const QuestRow = React.memo(function QuestRow({ quest, categories, onSave, onRemove }: QuestRowProps) {
  const [name, setName] = useState(quest.name);
  const [xp, setXp] = useState<number>(quest.xp);
  const [type, setType] = useState<Quest['type']>(quest.type);
  const [active, setActive] = useState<boolean>(quest.active);
  const [categoryId, setCategoryId] = useState<string | null>(quest.categoryId ?? null);

  useEffect(() => setName(quest.name), [quest.name]);
  useEffect(() => setXp(quest.xp), [quest.xp]);
  useEffect(() => setType(quest.type), [quest.type]);
  useEffect(() => setActive(quest.active), [quest.active]);
  useEffect(() => setCategoryId(quest.categoryId ?? null), [quest.categoryId]);

  const commit = useCallback(() => {
    onSave(quest.id, {
      name: name.trim() || quest.name,
      xp: Math.max(0, xp),
      type,
      active,
      categoryId,
    });
  }, [onSave, quest.id, name, xp, type, active, categoryId, quest.name]);

  return (
    <li
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 100px 140px 1fr auto auto',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        aria-label={`Quest ${quest.name} umbenennen`}
        style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #d0d7e6' }}
      />
      <input
        type="number"
        value={xp}
        min={0}
        onChange={(e) => setXp(Math.max(0, Number.parseInt(e.target.value, 10) || 0))}
        onBlur={commit}
        aria-label={`XP für ${quest.name}`}
        style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #d0d7e6' }}
      />
      <select
        value={type}
        onChange={(e) => {
          const next = e.target.value as Quest['type'];
          setType(next);
          onSave(quest.id, { type: next });
        }}
        aria-label={`Questtyp für ${quest.name}`}
        style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #d0d7e6' }}
      >
        {questTypes.map((qt) => (
          <option key={qt} value={qt}>
            {qt}
          </option>
        ))}
      </select>
      <select
        value={categoryId ?? ''}
        onChange={(e) => {
          const nextId = e.target.value ? e.target.value : null;
          setCategoryId(nextId);
          onSave(quest.id, { categoryId: nextId });
        }}
        aria-label={`Kategorie für ${quest.name}`}
        style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #d0d7e6' }}
      >
        <option value="">Keine Kategorie</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => {
            const checked = e.target.checked;
            setActive(checked);
            onSave(quest.id, { active: checked });
          }}
          aria-label={`${quest.name} aktiv schalten`}
        />
        Aktiv
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <AsyncButton
          type="button"
          onClick={commit}
          aria-label={`Quest ${quest.name} speichern`}
          style={{ padding: '6px 12px' }}
        >
          Speichern
        </AsyncButton>
        <button
          type="button"
          onClick={() => onRemove(quest.id)}
          aria-label={`Quest ${quest.name} löschen`}
          style={{ padding: '6px 12px' }}
        >
          Löschen
        </button>
      </div>
    </li>
  );
});
QuestRow.displayName = 'QuestRow';

type GroupRowProps = {
  team: Team;
  students: Student[];
  onRename: (id: ID, name: string) => void;
  onRemove: (id: ID) => void;
  onSetMembers: (id: ID, memberIds: ID[]) => void;
};

const GroupRow = React.memo(function GroupRow({ team, students, onRename, onRemove, onSetMembers }: GroupRowProps) {
  const [name, setName] = useState(team.name);
  useEffect(() => setName(team.name), [team.name]);

  const commitName = useCallback(() => {
    const trimmed = name.trim();
    const nextName = trimmed || 'Gruppe';
    if (nextName === team.name) {
      if (name !== team.name) {
        setName(team.name);
      }
      return;
    }
    setName(nextName);
    onRename(team.id, nextName);
  }, [name, team.id, team.name, onRename]);

  const membersSet = useMemo(() => new Set(team.memberIds), [team.memberIds]);

  const toggleMember = useCallback(
    (studentId: ID) => {
      const hasMember = team.memberIds.includes(studentId);
      const nextMembers = hasMember
        ? team.memberIds.filter((id) => id !== studentId)
        : [...team.memberIds, studentId];
      onSetMembers(team.id, nextMembers);
    },
    [team.memberIds, team.id, onSetMembers],
  );

  return (
    <li style={{ display: 'grid', gap: 12, padding: 12, border: '1px solid #d0d7e6', borderRadius: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitName();
            }
          }}
          aria-label={`${team.name} umbenennen`}
          style={{ flex: 1, minWidth: 160, padding: '6px 8px', borderRadius: 8, border: '1px solid #d0d7e6' }}
        />
        <span style={{ fontSize: 12, opacity: 0.7 }}>Mitglieder: {team.memberIds.length}</span>
        <button type="button" onClick={() => onRemove(team.id)} aria-label={`${team.name} löschen`} style={{ padding: '6px 12px' }}>
          Löschen
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 8,
          alignItems: 'center',
        }}
      >
        {students.length === 0 ? (
          <em>Keine Schüler vorhanden</em>
        ) : (
          students.map((student) => (
            <label key={student.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={membersSet.has(student.id)}
                onChange={() => toggleMember(student.id)}
                aria-label={`${student.alias} ${membersSet.has(student.id) ? 'aus Gruppe entfernen' : 'zur Gruppe hinzufügen'}`}
              />
              <span>{student.alias}</span>
            </label>
          ))
        )}
      </div>
    </li>
  );
});
GroupRow.displayName = 'GroupRow';

export default function ManageScreen({ onOpenSeasonReset }: ManageScreenProps = {}) {
  const { state, dispatch } = useApp();
  const feedback = useFeedback();
  const triggerSeasonReset = useCallback(() => {
    onOpenSeasonReset?.();
  }, [onOpenSeasonReset]);
  const [alias, setAlias] = useState('');
  const [qName, setQName] = useState('Hausaufgaben');
  const [qXP, setQXP] = useState(10);
  const [qType, setQType] = useState<'daily' | 'repeatable' | 'oneoff'>('daily');
  const [newQuestCategoryId, setNewQuestCategoryId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('Team A');
  const [badgeName, setBadgeName] = useState('');
  const [badgeDescription, setBadgeDescription] = useState('');
  const [badgeCategoryId, setBadgeCategoryId] = useState<string | null>(null);
  const [badgeRuleType, setBadgeRuleType] = useState<'total_xp' | 'category_xp'>('total_xp');
  const [badgeRuleThreshold, setBadgeRuleThreshold] = useState(100);
  const [badgeRuleCategoryId, setBadgeRuleCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [badgeIconPreview, setBadgeIconPreview] = useState<string | null>(null);
  const [badgeIconFile, setBadgeIconFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const badgeIconInputRef = useRef<HTMLInputElement | null>(null);
  const pendingImportAliasesRef = useRef<string[] | null>(null);
  const [lastImportedIds, setLastImportedIds] = useState<string[] | null>(null);
  const [bulkUndoDeadline, setBulkUndoDeadline] = useState<number | null>(null);
  const [undoTicker, setUndoTicker] = useState(0);
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
  const starIconKey = state.settings.classStarIconKey ?? null;

  const updateBadgeIcon = useCallback((file: File | null) => {
    setBadgeIconFile(file);
    setBadgeIconPreview((previous) => {
      if (previous && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        try {
          URL.revokeObjectURL(previous);
        } catch (error) {
          console.warn('Badge-Icon Vorschau konnte nicht freigegeben werden', error);
        }
      }
      if (file && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        try {
          return URL.createObjectURL(file);
        } catch (error) {
          console.warn('Badge-Icon Vorschau konnte nicht erstellt werden', error);
        }
      }
      return null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (badgeIconPreview && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        try {
          URL.revokeObjectURL(badgeIconPreview);
        } catch (error) {
          console.warn('Badge-Icon Vorschau konnte nicht freigegeben werden', error);
        }
      }
    };
  }, [badgeIconPreview]);

  const onBadgeIconChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      if (!file) {
        updateBadgeIcon(null);
        return;
      }
      if (
        !validateImageFile(file, feedback, {
          context: 'Badge-Icon',
          maxBytes: MAX_IMAGE_BYTES,
          recommendBytes: STAR_ICON_RECOMMENDED_BYTES,
          recommendMessage: 'Empfohlen: ≤ 512 KB für schnelle Ladezeiten.',
        })
      ) {
        event.target.value = '';
        updateBadgeIcon(null);
        return;
      }
      updateBadgeIcon(file);
    },
    [feedback, updateBadgeIcon],
  );

  const openStudentDetail = useCallback((id: string) => {
    setDetailStudentId(id);
  }, []);

  const closeStudentDetail = useCallback(() => {
    setDetailStudentId(null);
  }, []);

  const detailStudent = useMemo(
    () => selectStudentById({ students: state.students }, detailStudentId),
    [state.students, detailStudentId],
  );

  const detailLogs = useMemo(
    () =>
      detailStudentId
        ? selectLogsForStudent({ logs: state.logs }, detailStudentId, 50)
        : [],
    [state.logs, detailStudentId],
  );

  const categories = state.categories ?? [];

  const resolveCategoryName = useCallback(
    (id: string | null): string | null => {
      if (!id) return null;
      return categories.find((category) => category.id === id)?.name ?? null;
    },
    [categories],
  );

  useEffect(() => {
    if (detailStudentId && !detailStudent) {
      setDetailStudentId(null);
    }
  }, [detailStudentId, detailStudent]);

  const addStudent = useCallback(() => {
    const trimmed = alias.trim();
    if (!trimmed) return;
    dispatch({ type: 'ADD_STUDENT', alias: trimmed });
    setAlias('');
    feedback.success('Schüler gespeichert');
  }, [alias, dispatch, feedback]);

  const populateStudents = useCallback(() => {
    for (let i = 1; i <= 30; i++) {
      dispatch({ type: 'ADD_STUDENT', alias: `S${String(i).padStart(2, '0')}` });
    }
    feedback.info('30 Demo-Schüler hinzugefügt');
  }, [dispatch, feedback]);

  const onImportStudentsCsv = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const file = input.files?.[0];
      if (!file) return;
      try {
        pendingImportAliasesRef.current = null;
        const text = await file.text();
        const lines = text.split(/\r?\n/).map((line) => line.trim());
        const nonEmpty = lines.filter((line) => line.length > 0);
        if (!nonEmpty.length) {
          feedback.error('CSV ist leer');
          return;
        }
        const headerLike = nonEmpty[0].toLowerCase();
        const rows = headerLike.includes('alias') && nonEmpty.length > 1 ? nonEmpty.slice(1) : nonEmpty;
        const existing = new Set(state.students.map((student) => student.alias.trim().toLowerCase()));
        const seen = new Set<string>();
        const aliases: string[] = [];
        for (const row of rows) {
          if (!row) continue;
          const firstCell = row.split(/[;,]/)[0]?.trim() ?? '';
          if (!firstCell) continue;
          const key = firstCell.toLowerCase();
          if (seen.has(key) || existing.has(key)) {
            continue;
          }
          seen.add(key);
          existing.add(key);
          aliases.push(firstCell);
        }
        if (!aliases.length) {
          feedback.info('Keine neuen Schüler importiert');
          return;
        }
        pendingImportAliasesRef.current = aliases.map((alias) => alias.toLowerCase());
        dispatch({ type: 'ADD_STUDENTS_BULK', aliases });
      } catch (error) {
        console.error('CSV-Import fehlgeschlagen', error);
        feedback.error('CSV konnte nicht gelesen werden');
      } finally {
        input.value = '';
      }
    },
    [dispatch, feedback, state.students],
  );

  const addQuest = useCallback(() => {
    const trimmed = qName.trim();
    if (!trimmed) return;
    const base = newQuest(trimmed, qXP, qType);
    const questCategoryId = newQuestCategoryId;
    const questCategoryName = resolveCategoryName(questCategoryId);
    const quest: Quest = {
      ...base,
      categoryId: questCategoryId ?? null,
      category: questCategoryName,
    };
    dispatch({ type: 'ADD_QUEST', quest });
    feedback.success('Quest gespeichert');
  }, [dispatch, feedback, newQuestCategoryId, qName, qXP, qType, resolveCategoryName]);

  const populateQuests = useCallback(() => {
    const presets = Array.from({ length: 15 }, (_, i) =>
      newQuest(`Quest ${i + 1}`, 5 + ((i * 5) % 30), (i % 3 === 0 ? 'daily' : i % 3 === 1 ? 'repeatable' : 'oneoff')),
    );
    presets.forEach((quest) => dispatch({ type: 'ADD_QUEST', quest }));
    feedback.info('15 Demo-Quests hinzugefügt');
  }, [dispatch, feedback]);

  const handleCreateBadgeDefinition = useCallback(async () => {
    const trimmedName = badgeName.trim();
    if (!trimmedName) {
      feedback.error('Badge benötigt einen Namen');
      return;
    }
    const threshold = Number.isFinite(badgeRuleThreshold)
      ? Math.max(0, Math.round(badgeRuleThreshold))
      : 0;
    let iconKey: string | null = null;
    try {
      if (badgeIconFile) {
        iconKey = await putBlob(badgeIconFile);
      }
    } catch (error) {
      console.error('Badge-Icon konnte nicht gespeichert werden', error);
      feedback.error('Badge-Icon konnte nicht gespeichert werden');
      return;
    }
    const descriptionValue = badgeDescription.trim();
    const description = descriptionValue.length > 0 ? descriptionValue : undefined;
    const categoryId = badgeCategoryId;
    const categoryName = resolveCategoryName(categoryId);
    let rule: BadgeDefinition['rule'] = null;
    if (badgeRuleType === 'total_xp') {
      rule = { type: 'total_xp', threshold };
    } else {
      const selectedRuleCategoryId = badgeRuleCategoryId ?? categoryId ?? null;
      const ruleCategoryName =
        resolveCategoryName(selectedRuleCategoryId) ?? (selectedRuleCategoryId ? null : 'uncategorized');
      rule = {
        type: 'category_xp',
        categoryId: selectedRuleCategoryId,
        category: ruleCategoryName ?? 'uncategorized',
        threshold,
      };
    }
    const definition: BadgeDefinition = {
      id: `badge-${makeId()}`,
      name: trimmedName,
      description,
      category: categoryName,
      categoryId,
      iconKey,
      rule,
    };
    dispatch({ type: 'ADD_BADGE_DEF', definition });
    feedback.success('Badge gespeichert');
    updateBadgeIcon(null);
    if (badgeIconInputRef.current) {
      badgeIconInputRef.current.value = '';
    }
    setBadgeName('');
    setBadgeDescription('');
    setBadgeCategoryId(null);
    setBadgeRuleType('total_xp');
    setBadgeRuleThreshold(100);
    setBadgeRuleCategoryId(null);
  }, [
    badgeCategoryId,
    badgeDescription,
    badgeIconFile,
    badgeName,
    badgeRuleCategoryId,
    badgeRuleThreshold,
    badgeRuleType,
    badgeIconInputRef,
    categories,
    dispatch,
    feedback,
    resolveCategoryName,
    updateBadgeIcon,
  ]);

  const handleAddCategory = useCallback(() => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      feedback.error('Bitte einen Kategorienamen eingeben');
      return;
    }
    if (categories.some((category) => category.name.toLowerCase() === trimmed.toLowerCase())) {
      feedback.info('Kategorie existiert bereits');
      return;
    }
    dispatch({ type: 'CATEGORY_CREATE', name: trimmed });
    setNewCategoryName('');
    feedback.success('Kategorie gespeichert');
  }, [categories, dispatch, feedback, newCategoryName]);

  const handleRemoveCategory = useCallback(
    (id: string) => {
      if (usedCategoryIds.has(id)) {
        feedback.error('Kategorie wird derzeit verwendet und kann nicht gelöscht werden');
        return;
      }
      dispatch({ type: 'CATEGORY_DELETE', id });
      feedback.info('Kategorie gelöscht');
    },
    [dispatch, feedback, usedCategoryIds],
  );

  const onRemoveBadgeDefinition = useCallback(
    async (definition: BadgeDefinition) => {
      if (definition.iconKey) {
        try {
          await deleteBlob(definition.iconKey);
        } catch (error) {
          console.warn('Badge-Icon konnte nicht entfernt werden', error);
        }
      }
      dispatch({ type: 'REMOVE_BADGE_DEF', id: definition.id });
      feedback.info('Badge gelöscht');
    },
    [dispatch, feedback],
  );

  const onUpdateStudent = useCallback(
    (id: string, nextAlias: string) => {
      dispatch({ type: 'UPDATE_STUDENT_ALIAS', id, alias: nextAlias });
      feedback.success('Schüler aktualisiert');
    },
    [dispatch, feedback],
  );
  const onRemoveStudent = useCallback(
    async (id: string) => {
      const student = state.students.find((entry) => entry.id === id);
      if (student) {
        const stageKeys = getStageKeys(student.avatarPack);
        for (const key of stageKeys) {
          if (!key) continue;
          try {
            await deleteBlob(key);
          } catch (error) {
            console.warn('Avatar-Bild konnte nicht entfernt werden', error);
          }
        }
      }
      dispatch({ type: 'REMOVE_STUDENT', id });
      feedback.success('Schüler entfernt');
    },
    [dispatch, feedback, state.students],
  );
  const onAvatarModeChange = useCallback(
    (student: Student, mode: Student['avatarMode']) => {
      const normalized: Student['avatarMode'] = mode === 'imagePack' ? 'imagePack' : 'procedural';
      const updates: Partial<Student> = { avatarMode: normalized };
      if (normalized === 'imagePack') {
        updates.avatarPack = { stageKeys: getStageKeys(student.avatarPack) };
      }
      dispatch({ type: 'UPDATE_STUDENT_AVATAR', id: student.id, updates });
      feedback.info(
        normalized === 'imagePack'
          ? `${student.alias}: Bildpaket aktiviert`
          : `${student.alias}: prozeduraler Avatar aktiviert`,
      );
    },
    [dispatch, feedback],
  );
  const onStageUpload = useCallback(
    async (student: Student, stageIndex: number, file: File) => {
      if (
        !validateImageFile(file, feedback, {
          context: 'Avatar',
          maxBytes: MAX_IMAGE_BYTES,
        })
      ) {
        return;
      }
      try {
        const stageKeys = getStageKeys(student.avatarPack);
        const previousKey = stageKeys[stageIndex];
        if (previousKey) {
          await deleteBlob(previousKey);
        }
        const id = await putBlob(file);
        const nextKeys = [...stageKeys];
        nextKeys[stageIndex] = id;
        dispatch({
          type: 'UPDATE_STUDENT_AVATAR',
          id: student.id,
          updates: { avatarMode: 'imagePack', avatarPack: { stageKeys: nextKeys } },
        });
        feedback.success(`Avatar-Stufe ${stageIndex} gespeichert`);
      } catch (error) {
        console.error('Avatar-Upload fehlgeschlagen', error);
        feedback.error('Avatar konnte nicht gespeichert werden');
      }
    },
    [dispatch, feedback],
  );
  const onStageRemove = useCallback(
    async (student: Student, stageIndex: number) => {
      const stageKeys = getStageKeys(student.avatarPack);
      const nextKeys = [...stageKeys];
      const key = nextKeys[stageIndex];
      nextKeys[stageIndex] = null;
      try {
        if (key) {
          await deleteBlob(key);
        }
      } catch (error) {
        console.warn('Avatar-Bild konnte nicht entfernt werden', error);
      }
      const hasAny = nextKeys.some(Boolean);
      dispatch({
        type: 'UPDATE_STUDENT_AVATAR',
        id: student.id,
        updates: { avatarMode: hasAny ? 'imagePack' : 'procedural', avatarPack: { stageKeys: nextKeys } },
      });
      feedback.info(`Avatar-Stufe ${stageIndex} entfernt`);
    },
    [dispatch, feedback],
  );
  const onStarIconSelect = useCallback(
    async (file: File) => {
      if (
        !validateImageFile(file, feedback, {
          context: 'Stern-Icon',
          maxBytes: MAX_IMAGE_BYTES,
          recommendBytes: STAR_ICON_RECOMMENDED_BYTES,
          recommendMessage: 'Empfohlen: ≤ 512 KB für schnelle Ladezeiten.',
        })
      ) {
        return;
      }
      try {
        if (starIconKey) {
          await deleteBlob(starIconKey);
        }
        const id = await putBlob(file);
        dispatch({ type: 'UPDATE_SETTINGS', updates: { classStarIconKey: id } });
        feedback.success('Stern-Icon gespeichert');
      } catch (error) {
        console.error('Stern-Icon konnte nicht gespeichert werden', error);
        feedback.error('Stern-Icon konnte nicht gespeichert werden');
      }
    },
    [dispatch, feedback, starIconKey],
  );
  const onStarIconRemove = useCallback(async () => {
    if (starIconKey) {
      try {
        await deleteBlob(starIconKey);
      } catch (error) {
        console.warn('Stern-Icon konnte nicht entfernt werden', error);
      }
    }
    dispatch({ type: 'UPDATE_SETTINGS', updates: { classStarIconKey: null } });
    feedback.info('Stern-Icon entfernt');
  }, [dispatch, feedback, starIconKey]);

  const handleUndoImport = useCallback(() => {
    if (!lastImportedIds?.length) return;
    dispatch({ type: 'REMOVE_STUDENTS_BULK', ids: lastImportedIds });
    setLastImportedIds(null);
    setBulkUndoDeadline(null);
    setUndoTicker(0);
    feedback.info('Import rückgängig gemacht');
  }, [dispatch, feedback, lastImportedIds]);
  const onUpdateQuest = useCallback(
    (
      id: string,
      updates: Partial<Pick<Quest, 'name' | 'xp' | 'type' | 'active' | 'category' | 'categoryId'>>,
    ) => {
      dispatch({ type: 'UPDATE_QUEST', id, updates });
      feedback.success('Quest aktualisiert');
    },
    [dispatch, feedback],
  );
  const onRemoveQuest = useCallback(
    (id: string) => {
      dispatch({ type: 'REMOVE_QUEST', id });
      feedback.success('Quest gelöscht');
    },
    [dispatch, feedback],
  );

  const addGroup = useCallback(() => {
    const trimmed = groupName.trim();
    if (!trimmed) return;
    dispatch({ type: 'ADD_GROUP', name: trimmed });
    setGroupName('');
    feedback.success('Gruppe erstellt');
  }, [dispatch, feedback, groupName]);
  const onRenameGroup = useCallback(
    (id: ID, name: string) => {
      dispatch({ type: 'RENAME_GROUP', id, name });
      feedback.success('Gruppe umbenannt');
    },
    [dispatch, feedback],
  );
  const onRemoveGroup = useCallback(
    (id: ID) => {
      dispatch({ type: 'REMOVE_GROUP', id });
      feedback.success('Gruppe gelöscht');
    },
    [dispatch, feedback],
  );
  const onSetGroupMembers = useCallback(
    (id: ID, memberIds: ID[]) => {
      dispatch({ type: 'SET_GROUP_MEMBERS', id, memberIds });
      feedback.info('Gruppenzugehörigkeit aktualisiert');
    },
    [dispatch, feedback],
  );

  const sortedBadges = useMemo(
    () => [...(state.badgeDefs ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [state.badgeDefs],
  );
  const sortedStudents = useMemo(() => [...state.students].sort((a, b) => a.alias.localeCompare(b.alias)), [state.students]);
  const sortedQuests = useMemo(() => [...state.quests].sort((a, b) => a.name.localeCompare(b.name)), [state.quests]);
  const sortedTeams = useMemo(() => [...state.teams].sort((a, b) => a.name.localeCompare(b.name)), [state.teams]);
  const usedCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    state.quests.forEach((quest) => {
      if (quest.categoryId) ids.add(quest.categoryId);
    });
    (state.badgeDefs ?? []).forEach((definition) => {
      if (definition.categoryId) ids.add(definition.categoryId);
      if (definition.rule?.type === 'category_xp' && definition.rule.categoryId) {
        ids.add(definition.rule.categoryId);
      }
    });
    return ids;
  }, [state.badgeDefs, state.quests]);

  useEffect(() => {
    const pending = pendingImportAliasesRef.current;
    if (!pending || pending.length === 0) {
      return;
    }
    const aliasMap = new Map(state.students.map((student) => [student.alias.trim().toLowerCase(), student.id]));
    const addedIds = pending.map((alias) => aliasMap.get(alias)).filter((id): id is string => Boolean(id));
    pendingImportAliasesRef.current = null;
    if (addedIds.length > 0) {
      setLastImportedIds(addedIds);
      const expiresAt = Date.now() + 10_000;
      setBulkUndoDeadline(expiresAt);
      setUndoTicker(Date.now());
      feedback.success(`${addedIds.length} Schüler importiert`);
    } else {
      setLastImportedIds(null);
      setBulkUndoDeadline(null);
      setUndoTicker(0);
      feedback.info('Keine neuen Schüler importiert');
    }
  }, [state.students, feedback]);

  useEffect(() => {
    if (!bulkUndoDeadline) return;
    if (typeof window === 'undefined') return;
    const deadline = bulkUndoDeadline;
    setUndoTicker(Date.now());
    const interval = window.setInterval(() => {
      if (Date.now() >= deadline) {
        setLastImportedIds(null);
        setBulkUndoDeadline(null);
        setUndoTicker(0);
        window.clearInterval(interval);
        return;
      }
      setUndoTicker(Date.now());
    }, 500);
    return () => window.clearInterval(interval);
  }, [bulkUndoDeadline]);

  const remainingSeconds =
    bulkUndoDeadline != null
      ? Math.max(0, Math.ceil((bulkUndoDeadline - (undoTicker || Date.now())) / 1000))
      : 0;

  const onExport = useCallback(() => {
    if (typeof window === 'undefined') {
      console.warn('Export is only available in the browser.');
      return;
    }
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `classquest-backup-${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    feedback.success('Daten exportiert');
  }, [state, feedback]);

  useEffect(() => {
    const handleExport = () => onExport();
    const handleImport = () => {
      setImportError(null);
      fileInputRef.current?.click();
    };
    const handleReset = () => triggerSeasonReset();
    window.addEventListener(EVENT_EXPORT_DATA, handleExport as EventListener);
    window.addEventListener(EVENT_IMPORT_DATA, handleImport as EventListener);
    window.addEventListener(EVENT_OPEN_SEASON_RESET, handleReset as EventListener);
    return () => {
      window.removeEventListener(EVENT_EXPORT_DATA, handleExport as EventListener);
      window.removeEventListener(EVENT_IMPORT_DATA, handleImport as EventListener);
      window.removeEventListener(EVENT_OPEN_SEASON_RESET, handleReset as EventListener);
    };
  }, [onExport, triggerSeasonReset]);

  const onImportFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = typeof reader.result === 'string' ? reader.result : '';
          if (!text.trim()) {
            throw new Error('Leere Datei');
          }
          const shouldOverwrite = typeof window === 'undefined' ? true : window.confirm('Bestehende Daten überschreiben?');
          if (!shouldOverwrite) {
            setImportError(null);
            return;
          }
          dispatch({ type: 'IMPORT', json: text });
          setImportError(null);
          feedback.success('Daten importiert');
        } catch (error) {
          console.error('Import fehlgeschlagen', error);
          setImportError('Import fehlgeschlagen. Bitte überprüfe die Datei.');
          feedback.error('Import fehlgeschlagen: ungültige Datei.');
        } finally {
          input.value = '';
        }
      };
      reader.onerror = () => {
        console.error('Datei konnte nicht gelesen werden', reader.error);
        setImportError('Datei konnte nicht gelesen werden.');
        feedback.error('Datei konnte nicht gelesen werden.');
        input.value = '';
      };
      reader.readAsText(file);
    },
    [dispatch, feedback],
  );

  const canSaveBadge = badgeName.trim().length > 0;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={{ background: '#fff', padding: 16, borderRadius: 16 }}>
        <h2>Schüler verwalten</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            aria-label="Neuen Schüleralias"
            placeholder="Alias"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addStudent();
            }}
            style={{ flex: 1, minWidth: 180, padding: '8px 10px', borderRadius: 10, border: '1px solid #cbd5f5' }}
          />
          <AsyncButton type="button" onClick={() => addStudent()} style={{ padding: '10px 16px' }}>
            Hinzufügen
          </AsyncButton>
          <button type="button" onClick={populateStudents} style={{ padding: '10px 16px' }}>
            Demo: 30 Schüler
          </button>
          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            style={{ padding: '10px 16px' }}
          >
            CSV importieren
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={onImportStudentsCsv}
          />
        </div>
        {lastImportedIds && lastImportedIds.length > 0 && bulkUndoDeadline && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <button type="button" onClick={handleUndoImport} style={{ padding: '6px 12px' }}>
              Import rückgängig
            </button>
            <span style={{ fontSize: 12, opacity: 0.7 }}>({remainingSeconds}s)</span>
          </div>
        )}
        <ul style={{ display: 'grid', gap: 8, margin: 0, padding: 0, listStyle: 'none' }}>
          {sortedStudents.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              onSaveAlias={onUpdateStudent}
              onRemove={onRemoveStudent}
              onAvatarModeChange={onAvatarModeChange}
              onStageUpload={onStageUpload}
              onStageRemove={onStageRemove}
              onShowDetail={openStudentDetail}
            />
          ))}
        </ul>
      </section>

      <section style={{ background: '#fff', padding: 16, borderRadius: 16 }}>
        <h2>Class Goals &amp; Rewards</h2>
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <h3 style={{ margin: 0 }}>Stern-Icon</h3>
            <StarIconUploader blobKey={starIconKey} onSelect={onStarIconSelect} onRemove={onStarIconRemove} />
            <small style={{ color: '#64748b' }}>Empfohlen: WebP/PNG, transparent, ~256–512px.</small>
          </div>
        </div>
      </section>

      <section style={{ background: '#fff', padding: 16, borderRadius: 16 }}>
        <h2>Kategorien verwalten</h2>
        <p style={{ marginTop: 0, marginBottom: 12, fontSize: 14, color: '#475569' }}>
          Lege zentrale Kategorien an, die du für Quests und Badges auswählen kannst.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            aria-label="Kategoriename"
            placeholder="z. B. Hausaufgaben"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCategory();
              }
            }}
            style={{ flex: '1 1 200px', minWidth: 180, padding: '8px 10px', borderRadius: 10, border: '1px solid #cbd5f5' }}
          />
          <button type="button" onClick={handleAddCategory} style={{ padding: '10px 16px' }}>
            Kategorie hinzufügen
          </button>
        </div>
        {categories.length === 0 ? (
          <em>Noch keine Kategorien angelegt.</em>
        ) : (
          <ul style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: 0, padding: 0, listStyle: 'none' }}>
            {categories.map((category) => {
              const inUse = usedCategoryIds.has(category.id);
              return (
                <li
                  key={category.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    border: '1px solid #d0d7e6',
                    borderRadius: 12,
                    padding: '4px 8px',
                    background: '#f8fafc',
                  }}
                >
                  <span>{category.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(category.id)}
                    disabled={inUse}
                    title={inUse ? 'Kategorie wird verwendet' : 'Kategorie löschen'}
                    style={{ padding: '4px 8px' }}
                  >
                    Löschen
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section style={{ background: '#fff', padding: 16, borderRadius: 16 }}>
        <h2>Badges verwalten</h2>
        <p style={{ marginTop: 0, marginBottom: 12, fontSize: 14, color: '#475569' }}>
          Lege neue Badges an, lade eigene Icons hoch und steuere Auto-Auszeichnungen über XP-Schwellen und Kategorien.
        </p>
        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}
        >
          <div
            style={{
              border: '1px solid #d0d7e6',
              borderRadius: 12,
              padding: 12,
              display: 'grid',
              gap: 12,
            }}
          >
            <h3 style={{ margin: 0 }}>Neues Badge</h3>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontWeight: 600 }}>Name</span>
              <input
                value={badgeName}
                onChange={(e) => setBadgeName(e.target.value)}
                placeholder="z. B. Mathe-Profi"
                style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #cbd5f5' }}
              />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontWeight: 600 }}>Beschreibung (optional)</span>
              <input
                value={badgeDescription}
                onChange={(e) => setBadgeDescription(e.target.value)}
                placeholder="Kurzbeschreibung"
                style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #cbd5f5' }}
              />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontWeight: 600 }}>Kategorie (optional)</span>
              <select
                value={badgeCategoryId ?? ''}
                onChange={(e) => setBadgeCategoryId(e.target.value ? e.target.value : null)}
                style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #cbd5f5' }}
              >
                <option value="">Keine Kategorie</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 14,
                    border: '1px solid #d0d7e6',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {badgeIconPreview ? (
                    <img
                      src={badgeIconPreview}
                      alt="Badge-Vorschau"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: 28 }}>🏅</span>
                  )}
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <label style={{ fontWeight: 600 }}>
                    Icon (optional)
                    <input
                      ref={badgeIconInputRef}
                      type="file"
                      accept="image/png,image/webp,image/jpeg,image/jpg"
                      onChange={onBadgeIconChange}
                      style={{ marginTop: 4 }}
                    />
                  </label>
                  {badgeIconPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        updateBadgeIcon(null);
                        if (badgeIconInputRef.current) {
                          badgeIconInputRef.current.value = '';
                        }
                      }}
                      style={{ padding: '4px 8px', alignSelf: 'flex-start' }}
                    >
                      Icon entfernen
                    </button>
                  )}
                </div>
              </div>
              <small style={{ color: '#64748b' }}>PNG/WebP mit transparentem Hintergrund wirken am besten.</small>
            </div>
            <div
              style={{
                display: 'grid',
                gap: 8,
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              }}
            >
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontWeight: 600 }}>Auto-Regel</span>
                <select
                  value={badgeRuleType}
                  onChange={(e) => setBadgeRuleType(e.target.value as typeof badgeRuleType)}
                  style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #cbd5f5' }}
                >
                  <option value="total_xp">Gesamt-XP</option>
                  <option value="category_xp">Kategorie-XP</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontWeight: 600 }}>Schwelle</span>
                <input
                  type="number"
                  min={0}
                  value={badgeRuleThreshold}
                  onChange={(e) => setBadgeRuleThreshold(Number.parseInt(e.target.value, 10) || 0)}
                  style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #cbd5f5' }}
                />
              </label>
              {badgeRuleType === 'category_xp' && (
                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontWeight: 600 }}>Regel-Kategorie</span>
                  <select
                    value={badgeRuleCategoryId ?? ''}
                    onChange={(e) => setBadgeRuleCategoryId(e.target.value ? e.target.value : null)}
                    style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #cbd5f5' }}
                  >
                    <option value="">Kategorie wie oben oder „uncategorized“</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#64748b' }}>
                    Ohne Auswahl wird die Kategorie oben oder „uncategorized“ verwendet.
                  </small>
                </label>
              )}
            </div>
            <AsyncButton
              onClick={() => handleCreateBadgeDefinition()}
              style={{ padding: '10px 16px' }}
              busyLabel="Speichert…"
              doneLabel="Gespeichert"
              disabled={!canSaveBadge}
            >
              Badge speichern
            </AsyncButton>
          </div>
          <div
            style={{
              border: '1px solid #d0d7e6',
              borderRadius: 12,
              padding: 12,
              display: 'grid',
              gap: 12,
            }}
          >
            <h3 style={{ margin: 0 }}>Vorhandene Badges</h3>
            {sortedBadges.length === 0 ? (
              <em>Noch keine Badges angelegt.</em>
            ) : (
              <ul style={{ display: 'grid', gap: 8, margin: 0, padding: 0, listStyle: 'none' }}>
                {sortedBadges.map((badge) => (
                  <li
                    key={badge.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <BadgeIcon name={badge.name} iconKey={badge.iconKey} size={48} />
                      <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                        <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {badge.name}
                        </strong>
                        {badge.description && (
                          <span style={{ fontSize: 12, color: '#475569' }}>{badge.description}</span>
                        )}
                        <small style={{ fontSize: 12, color: '#64748b' }}>{describeBadgeRule(badge, categories)}</small>
                        {(() => {
                          const badgeCategoryName =
                            resolveCategoryName(badge.categoryId ?? null) ?? badge.category ?? null;
                          return badgeCategoryName ? (
                            <small style={{ fontSize: 12, color: '#475569' }}>
                              Kategorie: {badgeCategoryName}
                            </small>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <AsyncButton
                      onClick={() => onRemoveBadgeDefinition(badge)}
                      style={{ padding: '6px 12px' }}
                      busyLabel="Löscht…"
                      doneLabel="Gelöscht"
                    >
                      Löschen
                    </AsyncButton>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section style={{ background: '#fff', padding: 16, borderRadius: 16 }}>
        <h2>Quests verwalten</h2>
        <p style={{ marginTop: 0, marginBottom: 12, fontSize: 14, color: '#475569' }}>
          Weise Quests Kategorien zu, damit Auto-Badges auf Basis von Kategorie-XP funktionieren.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            aria-label="Questname"
            value={qName}
            onChange={(e) => setQName(e.target.value)}
            style={{ flex: 2, minWidth: 160, padding: '8px 10px', borderRadius: 10, border: '1px solid #cbd5f5' }}
          />
          <input
            aria-label="XP"
            type="number"
            min={0}
            value={qXP}
            onChange={(e) => setQXP(Number.parseInt(e.target.value, 10) || 0)}
            style={{ width: 100, padding: '8px 10px', borderRadius: 10, border: '1px solid #cbd5f5' }}
          />
          <select
            aria-label="Questtyp"
            value={qType}
            onChange={(e) => setQType(e.target.value as typeof qType)}
            style={{ minWidth: 140, padding: '8px 10px', borderRadius: 10, border: '1px solid #cbd5f5' }}
          >
            {questTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            aria-label="Quest-Kategorie"
            value={newQuestCategoryId ?? ''}
            onChange={(e) => setNewQuestCategoryId(e.target.value ? e.target.value : null)}
            style={{ minWidth: 160, padding: '8px 10px', borderRadius: 10, border: '1px solid #cbd5f5' }}
          >
            <option value="">Keine Kategorie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <AsyncButton type="button" onClick={() => addQuest()} style={{ padding: '10px 16px' }}>
            Quest anlegen
          </AsyncButton>
          <button type="button" onClick={populateQuests} style={{ padding: '10px 16px' }}>
            Demo: 15 Quests
          </button>
        </div>
        <ul style={{ display: 'grid', gap: 8, margin: 0, padding: 0, listStyle: 'none' }}>
          {sortedQuests.map((quest) => (
            <QuestRow
              key={quest.id}
              quest={quest}
              categories={categories}
              onSave={onUpdateQuest}
              onRemove={onRemoveQuest}
            />
          ))}
        </ul>
      </section>

      <section style={{ background: '#fff', padding: 16, borderRadius: 16 }}>
        <h2>Gruppen verwalten</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            aria-label="Gruppenname"
            placeholder="z. B. Team Alpha"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addGroup();
              }
            }}
            style={{ flex: 1, minWidth: 180, padding: '8px 10px', borderRadius: 10, border: '1px solid #cbd5f5' }}
          />
          <AsyncButton type="button" onClick={() => addGroup()} style={{ padding: '10px 16px' }}>
            Gruppe anlegen
          </AsyncButton>
        </div>
        <ul style={{ display: 'grid', gap: 12, margin: 0, padding: 0, listStyle: 'none' }}>
          {sortedTeams.map((team) => (
            <GroupRow
              key={team.id}
              team={team}
              students={sortedStudents}
              onRename={onRenameGroup}
              onRemove={onRemoveGroup}
              onSetMembers={onSetGroupMembers}
            />
          ))}
          {sortedTeams.length === 0 && <em>Noch keine Gruppen angelegt.</em>}
        </ul>
      </section>


      <section style={{ background: '#fff', padding: 16, borderRadius: 16 }}>
        <h2>Einstellungen</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={Boolean(state.settings.allowNegativeXP)}
              onChange={(e) => {
                dispatch({ type: 'UPDATE_SETTINGS', updates: { allowNegativeXP: e.target.checked } });
                feedback.success('Einstellung gespeichert');
              }}
            />
            Negative XP erlauben (Shop kann unter 0 gehen)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={Boolean(state.settings.sfxEnabled)}
              onChange={(e) => {
                dispatch({ type: 'UPDATE_SETTINGS', updates: { sfxEnabled: e.target.checked } });
                feedback.info(e.target.checked ? 'Soundeffekte aktiviert' : 'Soundeffekte deaktiviert');
              }}
            />
            Soundeffekte aktivieren
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={Boolean(state.settings.compactMode)}
              onChange={(e) => {
                dispatch({ type: 'UPDATE_SETTINGS', updates: { compactMode: e.target.checked } });
                feedback.info(e.target.checked ? 'Kompakte Ansicht aktiviert' : 'Kompakte Ansicht deaktiviert');
              }}
            />
            Kompakte Ansicht
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={state.settings.shortcutsEnabled !== false}
              onChange={(e) => {
                const checked = e.target.checked;
                dispatch({ type: 'UPDATE_SETTINGS', updates: { shortcutsEnabled: checked } });
                feedback.info(checked ? 'Tastaturkürzel aktiviert' : 'Tastaturkürzel deaktiviert');
              }}
            />
            Tastaturkürzel aktivieren
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={Boolean(state.settings.flags?.virtualize)}
              onChange={(e) => {
                const checked = e.target.checked;
                dispatch({
                  type: 'UPDATE_SETTINGS',
                  updates: { flags: { ...(state.settings.flags ?? {}), virtualize: checked } },
                });
                feedback.info(checked ? 'Virtualisierung aktiviert' : 'Virtualisierung deaktiviert');
              }}
            />
            Listen virtualisieren (für große Klassen)
          </label>
        </div>
      </section>
      <section style={{ background: '#fff', padding: 16, borderRadius: 16 }}>
        <h2>Saison zurücksetzen</h2>
        <p style={{ marginTop: 0, marginBottom: 12, fontSize: 14, color: '#475569' }}>
          Setzt XP, Level, Streaks und das Protokoll aller Schüler zurück. Schüler, Gruppen und Quests bleiben bestehen.
        </p>
        <button type="button" onClick={triggerSeasonReset} style={{ padding: '10px 18px', borderRadius: 12 }}>
          Saison-Reset starten
        </button>
      </section>
      <section style={{ background: '#fff', padding: 16, borderRadius: 16 }}>
        <h2>Backup &amp; Restore</h2>
        <p style={{ marginTop: 0, marginBottom: 12, fontSize: 14, color: '#475569' }}>
          Exportiere den aktuellen Klassenstand als JSON-Datei oder importiere eine Sicherung. Beim Import werden alle
          bestehenden Daten überschrieben.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <AsyncButton
            type="button"
            onClick={() => onExport()}
            style={{ padding: '10px 16px' }}
            busyLabel="Exportiere…"
            doneLabel="Exportiert"
          >
            Daten exportieren
          </AsyncButton>
          <AsyncButton
            type="button"
            onClick={() => {
              setImportError(null);
              fileInputRef.current?.click();
            }}
            style={{ padding: '10px 16px' }}
            busyLabel="Öffne…"
            doneLabel="Bereit"
          >
            Daten importieren
          </AsyncButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={onImportFile}
          />
          {importError && <span style={{ color: '#b91c1c', fontWeight: 600 }}>{importError}</span>}
        </div>
      </section>
      {detailStudent && (
        <StudentDetailScreen student={detailStudent} logs={detailLogs} onClose={closeStudentDetail} />
      )}
    </div>
  );
}
