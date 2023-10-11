import React, {useEffect, useState} from "react";
import {Container, Content, CustomProvider, Sidebar} from "rsuite";
import "./index.scss"
import Side from "@/components/side/side";
import PageContext from "@/PageContext";
import RightContent from "@/components/rightContent/RightContent";
import {ipcRenderer} from "electron";

interface State {
    theme: 'light' | 'dark' | 'high-contrast',
}

const App = () => {

    const [state, setState] = useState<State>();

    const [sideWidth, setSideWidth] = useState(280);

    let sideWidthBack = 280;

    const changeTheme = (theme: 'light' | 'dark' | 'high-contrast') => {
        ipcRenderer.send("saveData", "theme", theme);
        setState({theme: theme});
    }

    const getTheme = () => {
        if (state) {
            return state.theme;
        }
        const storeTheme = ipcRenderer.sendSync("getData", "theme");
        if (storeTheme) {
            setState({theme: storeTheme});
            return storeTheme;
        }
        return "light";
    }

    const contextVal = {
        theme: getTheme(),
        changeTheme: changeTheme,
    }

    const mousemove = (e: MouseEvent) => {
        const mouseX = e.x;
        const dragSideWidth = mouseX - 17;

        if ((dragSideWidth > 280) && (dragSideWidth < 1200)) {
            setSideWidth(dragSideWidth);
            sideWidthBack = dragSideWidth;
        }
    }

    const mouseup = () => {
        document.documentElement.removeEventListener('mousemove', mousemove);
        document.documentElement.removeEventListener('mouseup', mouseup);
        ipcRenderer.send("saveData", "sideWidth", sideWidthBack);
    }

    const bindSideBarDrag = () => {
        const dragPointer = document.getElementById('drag-resize-pointer');

        if (dragPointer) {
            dragPointer.addEventListener('mousedown', (e) => {
                e.preventDefault();

                document.documentElement.addEventListener('mousemove', mousemove);
                document.documentElement.addEventListener('mouseup', mouseup);
            });
        }
    }

    const initSideWidth = () => {
        const storeValue = ipcRenderer.sendSync("getData", "sideWidth");
        if (storeValue) {
            setSideWidth(storeValue);
        }
    }

    useEffect(() => {
        initSideWidth();
        bindSideBarDrag();
    }, []);

    return (
        <PageContext.Provider value={contextVal}>
            <CustomProvider theme={contextVal.theme}>
                <div>
                    <Container className='wrap-container'>

                        <div className='aside-drag-container'>
                            <Sidebar style={{ width: sideWidth + "px"}}>
                                <Side></Side>
                            </Sidebar>

                            <div className='drag-resize-container'>
                                <div className='drag-resize-pointer' id="drag-resize-pointer"></div>
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