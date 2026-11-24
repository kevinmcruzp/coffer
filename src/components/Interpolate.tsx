import { Fragment, type ReactNode } from 'react'

type Props = {
  // Translated text whose `{name}` placeholders were left unfilled.
  text: string
  // Markup to put in place of each placeholder.
  values: Record<string, ReactNode>
}

// Places styled pieces (an amount in mono, a key name) inside a translated sentence,
// wherever that language puts them.
export function Interpolate({ text, values }: Props) {
  const parts = text.split(/(\{\w+\})/)
  return (
    <>
      {parts.map((part, i) => {
        const name = /^\{(\w+)\}$/.exec(part)?.[1]
        return (
          <Fragment key={i}>
            {name !== undefined && Object.hasOwn(values, name) ? values[name] : part}
          </Fragment>
        )
      })}
    </>
  )
}
