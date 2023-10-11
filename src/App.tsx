import React, {useEffect, useState} from "react";
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

    const [sideWidth, setSideWidth] = useState(260);

    const changeTheme = (theme: 'light' | 'dark' | 'high-contrast') => {
        ipcRenderer.send("saveData", "theme", theme);
        setState({theme: theme});
    }

    const contextVal = {
        theme: state.theme,
        changeTheme: changeTheme,
    }

    const bindSideBarDrag = () => {
        const dragPointer = document.getElementById('drag-resize-pointer');

        if (dragPointer) {
            console.log("add event listener")
            dragPointer.addEventListener('mousedown', (e) => {
                e.preventDefault();

                document.documentElement.addEventListener('mousemove', mousemove);
                document.documentElement.addEventListener('mouseup', mouseup);
            });
        }

        const mousemove = (e: MouseEvent) => {
            console.log("move", e)
            const mouseX = e.x;
            const dragSideWidth = mouseX - 17;

            if ((dragSideWidth > 280) && (dragSideWidth < 1500)) {
                setSideWidth(dragSideWidth);
                ipcRenderer.send("saveData", "sideWidth", dragSideWidth);
            }
        }

        const mouseup = () => {
            console.log("up");
            document.documentElement.removeEventListener('mousemove', mousemove);
            document.documentElement.removeEventListener('mouseup', mouseup);
            // 存储当前宽度 涉及到 useState 异步更新不及时问题，待解决
        }
    }

    const initSideWidth = () => {
        const storeValue = ipcRenderer.sendSync("getData", "sideWidth");
        setSideWidth(storeValue);
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