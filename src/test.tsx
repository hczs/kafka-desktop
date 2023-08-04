import React, {useState} from 'react';
import {Form, Button, Input, Modal, Message, Table} from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import {Admin, Kafka} from "kafkajs";
import {useToaster} from 'rsuite';

const {Column, HeaderCell, Cell} = Table;


interface brokerInfo {
    nodeId: number;
    host: string;
    port: number
}

const Test: React.FC = () => {
    // kafka 是否已连接的标志
    const [kafkaConnFlag, setKafkaConnFlag] = useState(false);
    // 当前连接的 Kafka 连接对象
    const [curKafkaClient, setCurKafkaClient] = useState<Kafka>();
    // kafka admin 对象
    const [kafkaAdmin, setKafkaAdmin] = useState<Admin>();
    // clusterId
    const [clusterId, setClusterId] = useState<string>();
    // 集群节点信息
    const [brokers, setBrokers] = useState<Array<brokerInfo>>([]);
    // topic 列表
    const [topics, setTopics] = useState<Array<string>>([]);
    // 新建kafka连接模态框开启关闭控制
    const [open, setOpen] = useState(false);
    // kafka连接表单字段
    const [formValue, setFormValue] = useState<any>({
        clientName: 'test',
        brokers: '10.12.3.82:9092'
    });
    //
    const toaster = useToaster();

    // 关闭模态框
    const handleClose = () => {
        setOpen(false);
    };
    // 开启模态框
    const handleOpen = () => {
        setOpen(true);
    };

    async function sendHelloMsg() {
        const producer = curKafkaClient?.producer();
        await producer?.connect();
        await producer?.send({
            topic: 'test',
            messages: [
                {value: 'Hello world!'},
            ],
        });
    }

    async function kafkaAdminOperation() {
        await setKafkaAdmin(curKafkaClient?.admin());
        await kafkaAdmin?.connect();
        await kafkaAdmin?.describeCluster().then((res) => {
            setClusterId(res.clusterId);
            setBrokers(res.brokers);
        });
        await kafkaAdmin?.listTopics().then(res => {
            setTopics(res);
        })
    }

    // 创建 kafka client 对象
    const createKafkaClient = async () => {
        await setCurKafkaClient(() => {
            const tmpClient = new Kafka({
                clientId: formValue.clientName,
                brokers: formValue.brokers.split(','),
            });
            toaster.push(<Message showIcon type="success">连接成功！</Message>, {
                duration: 2000
            });
            return tmpClient;
        })
        await sendHelloMsg();
        await kafkaAdminOperation();
        handleClose();
    }
    return (
        <div>
            {/* 新建kafka连接弹框表单 */}
            <Modal open={open} onClose={handleClose} size="xs">
                <Modal.Header>
                    <Modal.Title>新建连接</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form fluid onChange={setFormValue} formValue={formValue}>
                        <Form.Group controlId="client-9">
                            <Form.ControlLabel>集群名称</Form.ControlLabel>
                            <Form.Control name="clientName"/>
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
                    <Button onClick={createKafkaClient} appearance="primary">
                        添加
                    </Button>
                    <Button onClick={handleClose} appearance="subtle">
                        取消
                    </Button>
                </Modal.Footer>
            </Modal>

            <Button onClick={handleOpen}>新建连接</Button>

            {/* 集群信息描述 */}
            <div>
                <h3>当前连接 Kafka 集群信息</h3>
                集群ID：{clusterId}
                <Table
                    height={200}
                    data={brokers}
                >
                    <Column width={100} align={"center"}>
                        <HeaderCell>节点ID</HeaderCell>
                        <Cell dataKey="nodeId"/>
                    </Column>

                    <Column width={100} align={"center"}>
                        <HeaderCell>主机地址</HeaderCell>
                        <Cell dataKey="host"/>
                    </Column>

                    <Column width={100} align={"center"}>
                        <HeaderCell>端口</HeaderCell>
                        <Cell dataKey="port"/>
                    </Column>
                </Table>
            </div>

            <div>
                <h3>topic列表</h3>

            </div>

            <div>
                <h3>消息发送</h3>
            </div>
        </div>
    )
}

export default Test;