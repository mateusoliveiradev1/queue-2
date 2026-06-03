"use client";

import { useEffect, useState } from "react";

export function TimezoneInput({
  defaultValue,
  detectOnMount = false,
  id = "duo-timezone",
  label = "Timezone da dupla",
  name = "timezone"
}: {
  defaultValue: string;
  detectOnMount?: boolean;
  id?: string;
  label?: string;
  name?: string;
}) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (!detectOnMount) {
      return;
    }

    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (detected) {
      setValue(detected);
    }
  }, [detectOnMount]);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        className="queue2-input"
        id={id}
        maxLength={80}
        name={name}
        onChange={(event) => setValue(event.target.value)}
        required
        type="text"
        value={value}
      />
    </div>
  );
}
