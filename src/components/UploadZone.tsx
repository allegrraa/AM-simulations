import { useRef, useState } from 'react'
import { Check, FileBox, UploadCloud } from 'lucide-react'

interface UploadZoneProps {
  title: string
  detail: string
  accept: string
  busy?: boolean
  complete?: boolean
  filename?: string
  multiple?: boolean
  onSelect: (files: File[]) => void
}

export function UploadZone({ title, detail, accept, busy, complete, filename, multiple, onSelect }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const receive = (files: FileList | null) => {
    if (busy) return
    const selected = files ? Array.from(files) : []
    if (selected.length) onSelect(selected)
  }

  return (
    <div
      className={`upload-zone${dragging ? ' is-dragging' : ''}${complete ? ' is-complete' : ''}`}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); receive(event.dataTransfer.files) }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(event) => { receive(event.target.files); event.target.value = '' }}
      />
      <div className="upload-icon">{complete ? <Check size={22} /> : <UploadCloud size={22} />}</div>
      <div>
        <strong>{complete && filename ? filename : title}</strong>
        <p>{busy ? 'Uploading and validating…' : complete ? 'Validated and linked to this analysis' : detail}</p>
      </div>
      <button type="button" className="button secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
        <FileBox size={16} />
        {complete ? 'Replace file' : multiple ? 'Select images' : 'Select STL'}
      </button>
    </div>
  )
}
