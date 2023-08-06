import React from 'react'

const PageContext = React.createContext<PageContextVal>({
    theme: "dark",
    changeTheme: () => {}
})
export default PageContext