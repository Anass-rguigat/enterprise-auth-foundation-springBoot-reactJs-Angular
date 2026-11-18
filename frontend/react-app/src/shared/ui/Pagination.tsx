import { Button } from './Button'

type Props = {
  page: number
  totalPages: number
  totalItems?: number | null
  pageSize?: number
  onPageChange: (page: number) => void
}

function pageWindow(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages = new Set<number>([1, total, current, current - 1, current + 1])
  if (current <= 3) {
    pages.add(2)
    pages.add(3)
    pages.add(4)
  }
  if (current >= total - 2) {
    pages.add(total - 1)
    pages.add(total - 2)
    pages.add(total - 3)
  }
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const result: (number | 'ellipsis')[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('ellipsis')
    result.push(p)
    prev = p
  }
  return result
}

export function Pagination({
  page,
  totalPages,
  totalItems = null,
  pageSize = 20,
  onPageChange,
}: Props) {
  const safeTotal = Math.max(totalPages || 1, 1)
  const safePage = Math.min(Math.max(page, 1), safeTotal)
  const from = totalItems == null || totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1
  const to =
    totalItems == null ? 0 : Math.min(safePage * pageSize, totalItems)

  return (
    <nav className="ui-page" aria-label="Pagination">
      <span className="ui-page__meta">
        {totalItems != null ? (
          <>
            Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{totalItems}</strong>
          </>
        ) : (
          <>
            Page {safePage} of {safeTotal}
          </>
        )}
      </span>
      <div className="ui-page__actions">
        <Button
          variant="secondary"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Previous page"
        >
          Previous
        </Button>
        <div className="ui-page__numbers" role="list">
          {pageWindow(safePage, safeTotal).map((item, index) =>
            item === 'ellipsis' ? (
              <span key={`e-${index}`} className="ui-page__ellipsis" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                role="listitem"
                className={`ui-page__num${item === safePage ? ' ui-page__num--active' : ''}`}
                aria-current={item === safePage ? 'page' : undefined}
                onClick={() => onPageChange(item)}
              >
                {item}
              </button>
            ),
          )}
        </div>
        <Button
          variant="secondary"
          disabled={safePage >= safeTotal}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </nav>
  )
}
