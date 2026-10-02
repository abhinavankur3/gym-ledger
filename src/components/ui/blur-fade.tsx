import type { ComponentProps } from "react"

type MarginType = string

interface BlurFadeProps extends ComponentProps<"div"> {
  duration?: number
  delay?: number
  offset?: number
  direction?: "up" | "down" | "left" | "right"
  inView?: boolean
  inViewMargin?: MarginType
  blur?: string
}

export function BlurFade({
  children,
  className,
  ...props
}: BlurFadeProps) {
  const cleanProps = { ...props }
  delete cleanProps.duration
  delete cleanProps.delay
  delete cleanProps.offset
  delete cleanProps.direction
  delete cleanProps.inView
  delete cleanProps.inViewMargin
  delete cleanProps.blur

  return <div className={className} {...cleanProps}>{children}</div>
}
