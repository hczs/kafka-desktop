import React, {useState} from "react";
import {Button, Container, Content, CustomProvider, Footer, Header, Sidebar} from "rsuite";
import "./index.scss"
import Side from "@/components/side/side";
import PageContext from "@/PageContext";
import RightContent from "@/components/rightContent/RightContent";
import {ipcRenderer} from "electron";

interface State {
    theme: 'light' | 'dark' | 'high-contrast',
}

const getTheme = () => {
    const storeTheme = ipcRenderer.sendSync("getData", "theme");
    if (storeTheme) {
        return storeTheme;
    }
    return "light";
}

const App = () => {

    const [state, setState] = useState<State>({theme: getTheme()});

    const changeTheme = (theme: 'light' | 'dark' | 'high-contrast') => {
        ipcRenderer.send("saveData", "theme", theme);
        setState({theme: theme});
    }

    const contextVal = {
        theme: state.theme,
        changeTheme: changeTheme,
    }

    return (
        <PageContext.Provider value={contextVal}>
            <CustomProvider theme={contextVal.theme}>
                <div>
                    <Container className='wrap-container'>

                        <div className='aside-drag-container'>
                            <Sidebar>
                                <Side></Side>
                            </Sidebar>

                            <div className='drag-resize-container'>
                                <div className='drag-resize-pointer'></div>
                            </div>
                        </div>

                        <Container className='right-content'>
                            <Content>
                                <RightContent></RightContent>
                            </Content>
                        </Container>

                    </Container>
                </div>
            </CustomProvider>
        </PageContext.Provider>
    )
}

export default App;