import type {
  DiscoveryCoopType,
  DiscoveryEditorialRarity
} from "../domain/recommendation-policy";

type DiscoveryFilterParams = {
  plataforma: string | null;
  disponibilidade: string | null;
  tempo: string | null;
  coop: string | null;
  mood: string | null;
  anoDe: string | null;
  anoAte: string | null;
  genero: string | null;
  raridade: string | null;
};

const coopOptions: Array<{ label: string; value: DiscoveryCoopType }> = [
  { label: "Campanha", value: "campaign" },
  { label: "Online", value: "online" },
  { label: "Local", value: "local" },
  { label: "Tela compartilhada", value: "shared-screen" }
];

const rarityOptions: Array<{ label: string; value: DiscoveryEditorialRarity }> = [
  { label: "Achado comum", value: "common" },
  { label: "Achado raro", value: "rare" },
  { label: "Coop epico", value: "epic" },
  { label: "Lenda da fila", value: "legendary" }
];

export function DiscoveryFilters({
  params
}: {
  params: DiscoveryFilterParams;
}) {
  return (
    <form action="/app/descobrir" className="discovery-filters">
      <fieldset className="discovery-filter-group">
        <legend>Filtros rapidos</legend>
        <div className="segmented-control" aria-label="Plataforma comum">
          <label>
            <input
              defaultChecked={params.plataforma !== "livre"}
              name="plataforma"
              type="radio"
              value="comum"
            />
            <span>Plataforma comum</span>
          </label>
          <label>
            <input
              defaultChecked={params.plataforma === "livre"}
              name="plataforma"
              type="radio"
              value="livre"
            />
            <span>Explorar fora</span>
          </label>
        </div>
        <div className="segmented-control" aria-label="Tempo estimado">
          <label>
            <input
              defaultChecked={!params.tempo}
              name="tempo"
              type="radio"
              value=""
            />
            <span>Qualquer tempo</span>
          </label>
          <label>
            <input
              defaultChecked={params.tempo === "curto"}
              name="tempo"
              type="radio"
              value="curto"
            />
            <span>Curto</span>
          </label>
          <label>
            <input
              defaultChecked={params.tempo === "medio"}
              name="tempo"
              type="radio"
              value="medio"
            />
            <span>Medio</span>
          </label>
        </div>
        <div className="segmented-control" aria-label="Disponibilidade">
          <label>
            <input
              defaultChecked={!params.disponibilidade}
              name="disponibilidade"
              type="radio"
              value=""
            />
            <span>Sem corte</span>
          </label>
          <label>
            <input
              defaultChecked={params.disponibilidade === "gratis"}
              name="disponibilidade"
              type="radio"
              value="gratis"
            />
            <span>Gratis</span>
          </label>
          <label>
            <input
              defaultChecked={params.disponibilidade === "game-pass"}
              name="disponibilidade"
              type="radio"
              value="game-pass"
            />
            <span>Game Pass</span>
          </label>
        </div>
      </fieldset>

      <details className="discovery-advanced-filters">
        <summary className="queue2-focusable">Mais filtros</summary>
        <fieldset className="discovery-filter-grid">
          <legend>Filtros avancados</legend>
          <label className="field">
            <span>Tipo de coop</span>
            <select className="queue2-input" defaultValue={params.coop ?? ""} name="coop">
              <option value="">Qualquer tipo</option>
              {coopOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Mood</span>
            <select className="queue2-input" defaultValue={params.mood ?? ""} name="mood">
              <option value="">Qualquer mood</option>
              <option value="laugh">Rir junto</option>
              <option value="think">Pensar junto</option>
              <option value="focus">Foco total</option>
              <option value="flexible">Meio termo</option>
            </select>
          </label>
          <label className="field">
            <span>Ano de</span>
            <input
              className="queue2-input"
              defaultValue={params.anoDe ?? ""}
              inputMode="numeric"
              maxLength={4}
              name="anoDe"
              placeholder="2018"
            />
          </label>
          <label className="field">
            <span>Ano ate</span>
            <input
              className="queue2-input"
              defaultValue={params.anoAte ?? ""}
              inputMode="numeric"
              maxLength={4}
              name="anoAte"
              placeholder="2026"
            />
          </label>
          <label className="field">
            <span>Genero</span>
            <input
              className="queue2-input"
              defaultValue={params.genero ?? ""}
              name="genero"
              placeholder="puzzle, aventura..."
            />
          </label>
          <label className="field">
            <span>Raridade editorial</span>
            <select className="queue2-input" defaultValue={params.raridade ?? ""} name="raridade">
              <option value="">Qualquer raridade</option>
              {rarityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
      </details>

      <button className="queue2-button" data-tone="primary" type="submit">
        Aplicar filtros
      </button>
    </form>
  );
}
