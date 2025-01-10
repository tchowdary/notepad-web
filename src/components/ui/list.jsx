import * as React from "react"
import { cn } from "./utils"

const List = React.forwardRef(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn(
      "space-y-1",
      className
    )}
    {...props}
  />
))
List.displayName = "List"

const ListItem = React.forwardRef(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn(
      "flex items-center px-4 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md",
      className
    )}
    {...props}
  />
))
ListItem.displayName = "ListItem"

export { List, ListItem }
