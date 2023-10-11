import React, {useContext, useEffect, useState} from 'react';
import {
    Button,
    Col,
    Dropdown,
    Form,
    Grid,
    IconButton,
    Modal,
    Popover,
    Row,
    Schema,
    Table, Tooltip,
    Whisper
} from "rsuite";
import "./side.scss"
import PageContext from "@/PageContext";
import {Icon} from "@rsuite/icons";
import {MdOutlineNightlight, MdOutlineLightMode} from 'react-icons/md';
import PubSub from "pubsub-js"
import {RowDataType} from 'rsuite/esm/Table';
import TrashIcon from '@rsuite/icons/Trash';
import {TbPlugConnected} from "react-icons/tb";
import {nanoid} from "nanoid";
import {FormInstance} from "rsuite/esm/Form/Form";
import MoreIcon from '@rsuite/icons/legacy/More';
import EditIcon from '@rsuite/icons/Edit';


const {ipcRenderer} = window.require('electron');

const {Column, HeaderCell, Cell} = Table;

const Side = () => {
    const context = useContext(PageContext);

    // 新建kafka连接模态框开启关闭控制
    const [open, setOpen] = useState(false);
    // 确认删除框控制
    const [delModalOpen, setDelModalOpen] = useState(false);

    const defaultFormValue = {
        id: '',
        clusterName: '',
        brokers: ''
    }

    // kafka连接表单字段
    const [formValue, setFormValue] = useState<any>(defaultFormValue);

    // 表单校验
    const model = Schema.Model({
        clusterName: Schema.Types.StringType().isRequired('请输入集群信息'),
        brokers: Schema.Types.StringType().isRequired('请输入集群地址，格式 ip:port 多个节点使用英文逗号分隔')
    });

    const formRef = React.createRef<FormInstance>();

    const [clusterList, setClusterList] = useState<Array<ClusterInfo>>([]);

    // 当前已选的更新或删除的行
    const [selectedRowData, setSelectedRowData] = useState<RowDataType>([]);

    // 连接按钮选中的行
    const [connRowData, setConnRowData] = useState<RowDataType>([]);

    const [updateFlag, setUpdateFlag] = useState(false);

    useEffect(() => {
        console.log("side mount");
        const storeValue = ipcRenderer.sendSync("getData", "clusterInfo");
        setClusterList(storeValue == undefined ? [] : storeValue);
        // 订阅连接响应信息
        PubSub.subscribe("connectResultTopic", connectResultConsumer);
    }, [])

    const connectResultConsumer = (msg: any, data: any) => {
        if (data.success) {
            setConnRowData(data.data);
        }
    }

    const changeTheme = () => {
        const targetTheme = context.theme == "light" ? "dark" : "light";
        context.changeTheme(targetTheme);
    };

    const connect = (rowData: RowDataType<never>) => {
        console.log('connect rowData:', rowData);
        // setConnRowData(rowData);
        // publish a topic asynchronously
        PubSub.publish('clusterInfoTopic', rowData);
    }

    // 关闭模态框
    const handleClose = () => {
        setFormValue(defaultFormValue);
        setOpen(false);
    };

    // 开启新增模态框
    const handleOpen = () => {
        setUpdateFlag(false);
        setOpen(true);
    };

    const handleSubmit = () => {
        if (!formRef.current?.check()) {
            return;
        }
        if (updateFlag) {
            updateKafkaClusterInfo();
        } else {
            addKafkaClusterInfo();
        }
    }

    const updateKafkaClusterInfo = () => {
        clusterList[clusterList.indexOf(selectedRowData as ClusterInfo)] = formValue;
        handleClose();
        ipcRenderer.send("saveData", "clusterInfo", clusterList);
    }

    // 添加 kafka 集群信息 本地存储 list 新增
    const addKafkaClusterInfo = () => {
        formValue.id = nanoid();
        clusterList.push(formValue);
        handleClose();
        ipcRenderer.send("saveData", "clusterInfo", clusterList);
    }

    const openDelModal = (rowData: RowDataType<never>) => {
        setDelModalOpen(true);
        console.log("selected rowData: ", rowData);
        setSelectedRowData(rowData);
    }

    // 打开更新框
    const openUpdateModal = (rowData: RowDataType<never>) => {
        setUpdateFlag(true);
        console.log("update rowData: ", rowData);
        setSelectedRowData(rowData);
        setFormValue(rowData);
        setOpen(true);
    }

    const deleteCluster = () => {
        clusterList.splice(clusterList.indexOf(selectedRowData as ClusterInfo), 1);
        ipcRenderer.send("saveData", "clusterInfo", clusterList);
        setDelModalOpen(false);
    }

    return (
        <div className='side-container'>

            <div className='connect-container'>
                <div className='row-container'>
                    <div className='conn-btn'>
                        <Button appearance="primary" block
                                onClick={handleOpen}>新建连接</Button>
                    </div>
                    <div className={"icon-btn"}>
                        <IconButton
                            icon={
                                <Icon
                                    as={context.theme === 'light' ? MdOutlineNightlight : MdOutlineLightMode}
                                />
                            }
                            onClick={changeTheme}
                        />
                    </div>
                </div>
            </div>
            <div className='cluster-list'>
                <Table
                    autoHeight={true}
                    bordered={false}
                    cellBordered={false}
                    data={clusterList}
                    showHeader={false}
                    rowClassName={(rowData, _) => {
                        if (rowData.id === connRowData.id) {
                            return context.theme + '-conn-row';
                        }
                        return '';
                    }}
                >

                    <Column align="left" flexGrow={1}>
                        <HeaderCell>clusterName</HeaderCell>
                        <Cell dataKey="clusterName"/>
                    </Column>

                    <Column align="center" width={45}>
                        <HeaderCell>...</HeaderCell>
                        <Cell style={{padding: '6px'}}>
                            {rowData => (
                                <div>
                                    <Whisper placement={"autoVertical"} trigger={"hover"} speaker={
                                        <Tooltip>连接</Tooltip>}>
                                        <IconButton appearance="subtle" icon={
                                            <Icon as={TbPlugConnected}/>
                                        } onClick={() => {
                                            connect(rowData)
                                        }}>
                                        </IconButton>
                                    </Whisper>
                                </div>
                            )}
                        </Cell>
                    </Column>

                    <Column width={50} fixed="right">
                        <HeaderCell>
                            <MoreIcon/>
                        </HeaderCell>
                        <Cell style={{padding: '6px'}}>
                            {
                                rowData => (
                                    <div>
                                        <Whisper placement="autoVerticalStart" trigger="click"
                                                 speaker={<Popover style={{padding: '0'}}>
                                                     <Dropdown.Menu>
                                                         <Dropdown.Item eventKey={1} onClick={() => {
                                                             openUpdateModal(rowData)
                                                         }} style={{padding: '0'}}>
                                                             <Button appearance={"subtle"} size={"xs"} startIcon={<EditIcon />}>
                                                                 编辑连接
                                                             </Button>
                                                         </Dropdown.Item>

                                                         <Dropdown.Item eventKey={1} onClick={() => {
                                                             openDelModal(rowData)
                                                         }} style={{padding: '0'}}>
                                                             <Button appearance={"subtle"} size={"xs"} startIcon={<TrashIcon />}>
                                                                 删除连接
                                                             </Button>
                                                         </Dropdown.Item>
                                                     </Dropdown.Menu>
                                                 </Popover>}>
                                            <IconButton appearance="subtle" icon={<MoreIcon/>}/>
                                        </Whisper>
                                    </div>
                                )
                            }
                        </Cell>
                    </Column>
                </Table>
            </div>

            {/* 新建kafka连接弹框表单 */}
            <Modal open={open} onClose={handleClose} size="xs" backdrop={"static"}>
                <Modal.Header>
                    <Modal.Title>{
                        updateFlag ? "编辑连接" : "新建连接"
                    }</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form ref={formRef} fluid onChange={setFormValue} formValue={formValue} model={model}>
                        <Form.Group controlId="client-9">
                            <Form.ControlLabel>集群名称</Form.ControlLabel>
                            <Form.Control name="clusterName"/>
                            <Form.HelpText>随意输入</Form.HelpText>
                        </Form.Group>
                        <Form.Group controlId="broker-9">
                            <Form.ControlLabel>集群地址</Form.ControlLabel>
                            <Form.Control name="brokers"/>
                            <Form.HelpText>格式 ip:port 多个节点使用逗号分隔</Form.HelpText>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={handleSubmit} appearance="primary">
                        确定
                    </Button>
                    <Button onClick={handleClose} appearance="subtle">
                        取消
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* 确认删除模态框 */}
            <Modal size={'xs'} open={delModalOpen} backdrop={"static"}>
                <Modal.Header>
                    <Modal.Title>确认删除该连接？</Modal.Title>
                </Modal.Header>
                <Modal.Footer>
                    <Button onClick={() => {
                        setDelModalOpen(false);
                    }} appearance="subtle">
                        取消
                    </Button>
                    <Button onClick={deleteCluster} appearance="primary">
                        确认
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Side;