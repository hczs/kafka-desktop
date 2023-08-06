import React, {useState} from "react";
import {Button, Container, Content, CustomProvider, Footer, Header, Sidebar} from "rsuite";
import "./index.scss"
import Side from "@/components/side/side";
import PageContext from "@/PageContext";
import RightContent from "@/components/rightContent/RightContent";

interface State {
    theme: 'light' | 'dark' | 'high-contrast',
}

const App = () => {

    const [state, setState] = useState<State>({theme: "dark"});

    const changeTheme = (theme: 'light' | 'dark' | 'high-contrast') => {
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