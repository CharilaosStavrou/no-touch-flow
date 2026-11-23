import { isEmpty } from '../lib/content'

/** Visible badge shown wherever a content.json field is empty. */
export function NotFilledBadge() {
  return (
    <span className="badge-empty" role="note" aria-label="Not filled in yet">
      Not filled in yet
    </span>
  )
}

/** Renders the text, or the badge when the field is empty. */
export function Field({ value }: { value: string }) {
  return isEmpty(value) ? <NotFilledBadge /> : <>{value}</>
}
