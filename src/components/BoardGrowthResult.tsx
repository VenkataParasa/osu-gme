interface BoardGrowthProgram {
  id: string;
  name: string;
  rate: number;
  year: number;
  opportunities: { title: string; year: string }[];
}

const formatRate = (rate: number) => `${(rate * 100).toFixed(1)}%`;

export default function BoardGrowthResult({
  programs,
}: {
  programs: BoardGrowthProgram[];
}) {
  return (
    <section
      className="spotonix-board-results"
      aria-label="Board pass rates and growth opportunities"
    >
      <span className="spotonix-board-eyebrow">PROGRAM PERFORMANCE</span>
      <h2>Bottom {programs.length} board pass rates</h2>
      <p>
        Latest reported 3-year rolling rates, ordered lowest first. Programs
        without a recorded rate are excluded.
      </p>
      <figure className="spotonix-board-chart">
        <figcaption>3-year board pass rate (%)</figcaption>
        {programs.map((program, index) => (
          <div className="spotonix-board-bar-row" key={program.id}>
            <div className="spotonix-board-bar-label">
              <span>
                {index + 1}. {program.name}
              </span>
              <strong>{formatRate(program.rate)}</strong>
            </div>
            <div className="spotonix-board-track" aria-hidden="true">
              <div
                className={`spotonix-board-fill rank-${index + 1}`}
                style={{ width: `${program.rate * 100}%` }}
              />
            </div>
          </div>
        ))}
        <div className="spotonix-board-axis" aria-hidden="true">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </figure>
      <h3>Growth opportunities by program</h3>
      <div className="spotonix-board-table-wrap">
        <table className="spotonix-board-table">
          <caption>
            Board performance and recorded program growth opportunities
          </caption>
          <thead>
            <tr>
              <th scope="col">Program</th>
              <th scope="col">3-year pass rate</th>
              <th scope="col">Growth opportunities</th>
            </tr>
          </thead>
          <tbody>
            {programs.map((program, index) => (
              <tr key={program.id}>
                <th scope="row">
                  {index + 1}. {program.name}
                  <small>Board reporting year {program.year}</small>
                </th>
                <td>
                  <strong>{formatRate(program.rate)}</strong>
                </td>
                <td>
                  {program.opportunities.length ? (
                    <ul>
                      {program.opportunities.map((opportunity) => (
                        <li key={opportunity.title}>
                          {opportunity.title}
                          <small>Assessment {opportunity.year}</small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "No growth opportunities recorded"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="spotonix-board-source">
        Sources: Board Pass Metrics and Program Health Assessments. Growth
        opportunities are recorded planning items, not inferred causes of low
        pass rates.
      </p>
    </section>
  );
}
