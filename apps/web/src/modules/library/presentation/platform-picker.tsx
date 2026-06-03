import {
  PLATFORM_OPTIONS,
  type PlatformKey
} from "../domain/platforms";

export function PlatformPicker({
  action,
  returnTo,
  selected
}: {
  action: (formData: FormData) => Promise<void>;
  returnTo?: string;
  selected: PlatformKey[];
}) {
  return (
    <form action={action} className="platform-picker">
      <fieldset>
        <legend>Minhas plataformas</legend>
        <div className="platform-options">
          {PLATFORM_OPTIONS.map((platform) => (
            <label className="platform-option" htmlFor={`platform-${platform.key}`} key={platform.key}>
              <input
                defaultChecked={selected.includes(platform.key)}
                id={`platform-${platform.key}`}
                name="platforms"
                type="checkbox"
                value={platform.key}
              />
              <span>{platform.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
      <button className="queue2-button" data-tone="primary" type="submit">
        Salvar plataformas
      </button>
    </form>
  );
}
