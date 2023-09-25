import React, {useEffect, useState} from 'react';
import {Admin, Kafka, PartitionMetadata} from "kafkajs";
import {
    Button,
    Form,
    InputNumber,
    Message,
    Modal,
    Schema,
    Table,
    Tag,
    toaster,
} from "rsuite";
import {RowDataType} from 'rsuite/esm/Table';
import to from "await-to-js";
import "./topics.scss";
import TrashIcon from '@rsuite/icons/Trash';
import InfoOutlineIcon from '@rsuite/icons/InfoOutline';
import {FormInstance} from "rsuite/esm/Form/Form";


const {Column, HeaderCell, Cell} = Table;

interface Props {
    kafkaClient?: Kafka
}

interface TopicTableData {
    topicName: string,
    partitionCount: number,
    partitionInfo: PartitionInfo[]
}

interface PartitionInfo {
    // 分区ID
    partitionId: number,
    // brokerInfo[brokerId=id] eg: 192.168.31.155:9092[brokerId=0]
    leader: string,
    // 副本broker
    replicas: number[],
    // isr broker
    isr: number[],
    // admin.fetchTopicOffsets(topic) 获取
    offset?: number,
    high?: number,
    low?: number,
}

interface SearchForm {
    topicName: string
}

const Topics = (props: Props) => {

    const [kafkaAdmin, setKafkaAdmin] = useState<Admin>();

    const [topicTableDataList, setTopicTableDataList] = useState<Array<TopicTableData>>([]);

    const [partitionModalOpen, setPartitionModalOpen] = useState(false);

    const [partitionInfoList, setPartitionInfoList] = useState<Array<PartitionMetadata>>([]);

    const [tableLoading, setTableLoading] = useState(false);

    const [delModalOpen, setDelModalOpen] = useState(false);

    const [selectedTopic, setSelectedTopic] = useState<string>();

    const emptySearchFormValue: SearchForm = {
        topicName: ''
    }

    const [searchFormValue, setSearchFormValue] = useState<any>(emptySearchFormValue);

    const formRef = React.createRef<FormInstance>();

    const defaultTopicFormValue = {
        topic: "",
        numPartitions: 1,
        replicationFactor: 1
    }

    const [topicConfigForm, setTopicConfigForm] = useState<any>(defaultTopicFormValue);

    const [addTopicModalOpen, setAddTopicModalOpen] = useState(false);

    const [addTopicBtnLoading, setAddTopicBtnLoading] = useState(false);

    const [partitionModalLoading, setPartitionModalLoading] = useState(false);
    // 表单校验
    const model = Schema.Model({
        topic: Schema.Types.StringType().isRequired('请输入Topic名称'),
        numPartitions: Schema.Types.NumberType().isRequired('请填写分区数'),
        replicationFactor: Schema.Types.NumberType().isRequired('请填写副本数'),
    });

    useEffect(() => {
        if (!props.kafkaClient) {
            return;
        }
        console.log("Topics component mount");
        connectToAdmin().then(res => {
            setKafkaAdmin(res);
        })
        return () => {
            console.log("[unmount] Topics component");
            kafkaAdmin?.disconnect();
            console.log("Topics admin disconnect");
        }
    }, [props.kafkaClient])

    const connectToAdmin = async () => {
        setTableLoading(true);
        const admin = props.kafkaClient?.admin();
        if (!admin) {
            return;
        }
        const [err] = await to(admin?.connect());
        if (err) {
            toaster.push(<Message showIcon type="error">集群连接异常，请检查网络或者集群配置信息是否正确</Message>, {
                duration: 2000
            });
        } else {
            fetchTopicsTableData(admin);
        }

        return admin;
    }

    const convertToPartitionInfo = (partitions: PartitionMetadata[], brokerMap: Map<number, string>) => {
        const resArray: Array<PartitionInfo> = [];
        partitions.forEach(item => {
            resArray.push({
                partitionId: item.partitionId,
                leader: brokerMap.get(item.leader) + "[brokerId=" + item.leader + "]",
                replicas: item.replicas,
                isr: item.isr,
            })
        })
        return resArray;
    }

    const fetchTableData = async (admin: Admin | undefined) => {
        const dataList: Array<TopicTableData> = [];
        if (!admin) {
            return dataList;
        }
        const clusterInfo = await admin.describeCluster();
        const brokerMap = new Map(clusterInfo.brokers
            .map(item => [item.nodeId, item.host + ":" + item.port]))
        const topicMetaDataList = await admin.fetchTopicMetadata();
        console.log("topicMetaDataList: ", topicMetaDataList);
        topicMetaDataList.topics.forEach(item => {
            dataList.push({
                topicName: item.name,
                partitionCount: item.partitions.length,
                partitionInfo: convertToPartitionInfo(item.partitions, brokerMap),
            });
        });
        return dataList;
    }

    const fetchTopicsTableData = (admin: Admin | undefined) => {
        setTableLoading(true);
        fetchTableData(admin).then((res) => {
            setTopicTableDataList(res);
            setTableLoading(false);
        })
    }

    const openPartitionModal = (rowData: RowDataType<never>) => {
        setPartitionModalOpen(true);
        setPartitionModalLoading(true);
        // 获取offset数据
        kafkaAdmin?.fetchTopicOffsets(rowData.topicName).then(res => {
            const partitionInfoMap = new Map(res.map(item => [item.partition, item]));
            rowData.partitionInfo.forEach((item: any) => {
                const pInfo = partitionInfoMap.get(item.partitionId);
                item.offset = pInfo?.offset;
                item.high = pInfo?.high;
                item.low = pInfo?.low;
            })
            setPartitionInfoList(rowData.partitionInfo);
        }).finally(() => {
            setPartitionModalLoading(false);
        });
    }

    const searchTopic = async () => {
        const dataList = await fetchTableData(kafkaAdmin);
        setTopicTableDataList(dataList
            .filter(item => item.topicName.indexOf(searchFormValue.topicName) >= 0));
    }

    const resetTopicTable = () => {
        setSearchFormValue(emptySearchFormValue);
        fetchTopicsTableData(kafkaAdmin);
    }

    const openDelModal = (topicName: string) => {
        setDelModalOpen(true);
        setSelectedTopic(topicName);
    }

    const deleteTopic = (topicName: string | undefined) => {
        if (!topicName) {
            return;
        }
        setTableLoading(true);
        kafkaAdmin?.deleteTopics({topics: [topicName], timeout: 2000}).then(() => {
            toaster.push(<Message showIcon type="success">删除成功</Message>, {
                duration: 2000
            });
            fetchTopicsTableData(kafkaAdmin);
        }).catch(() => {
            toaster.push(<Message showIcon type="error">连接异常，删除失败</Message>, {
                duration: 2000
            });
        }).finally(() => {
            setTableLoading(false);
            setDelModalOpen(false);
        });
    }

    const handleAddTopicSubmit = async () => {
        setAddTopicBtnLoading(true);
        if (!formRef.current?.check()) {
            setAddTopicBtnLoading(false);
            return;
        }
        const addOpt = {
            topics: [{
                topic: topicConfigForm.topic,
                numPartitions: topicConfigForm.numPartitions,
                replicationFactor: topicConfigForm.replicationFactor,
            }]
        }
        kafkaAdmin?.createTopics(addOpt).then(res => {
            if (res) {
                toaster.push(<Message showIcon type="success">添加成功</Message>, {
                    duration: 2000
                });
                fetchTopicsTableData(kafkaAdmin);
                handleAddTopicClose();
            } else {
                toaster.push(<Message showIcon type="error">添加失败，请检查Topic是否重复</Message>, {
                    duration: 2000
                });
            }
        }).catch(() => {
            toaster.push(<Message showIcon type="error">添加失败，请检查参数设置是否合理</Message>, {
                duration: 2000
            });
        }).finally(() => {
            setAddTopicBtnLoading(false);
        })
    }

    const handleAddTopicClose = () => {
        setTopicConfigForm(defaultTopicFormValue);
        setAddTopicModalOpen(false);
    }

    const openAddTopicModal = () => {
        if (props.kafkaClient) {
            setAddTopicModalOpen(true);
        }
    }


    return (
        <div className="right-panel">
            {/* 搜索表单 */}
            <Form className={"search-form"} layout={"inline"} formValue={searchFormValue} onChange={setSearchFormValue}>
                <Form.Group controlId="topicName">
                    <Form.ControlLabel>topic</Form.ControlLabel>
                    <Form.Control name="topicName" style={{width: 260}}/>
                </Form.Group>
                <div style={{float: "right"}}>
                    <Button appearance={"primary"} onClick={searchTopic}>查询</Button>
                    <Button style={{marginLeft: "8px"}} onClick={resetTopicTable}>重置</Button>
                </div>
            </Form>
            <hr/>
            <Button style={{margin: "0 0 15px 0"}} onClick={openAddTopicModal}>新建</Button>
            <br/>
            {/* topic main table */}
            <Table
                fillHeight
                data={topicTableDataList}
                loading={tableLoading}
            >
                <Column flexGrow={1} align="center">
                    <HeaderCell>topic</HeaderCell>
                    <Cell dataKey="topicName"/>
                </Column>

                <Column flexGrow={1} align="center">
                    <HeaderCell>分区数</HeaderCell>
                    <Cell dataKey="partitionCount"/>
                </Column>

                <Column flexGrow={1} fixed="right">
                    <HeaderCell>操作</HeaderCell>
                    <Cell style={{padding: '6px'}}>
                        {rowData => (
                            <div>
                                <Button startIcon={<InfoOutlineIcon/>} appearance="subtle"
                                        onClick={() => openPartitionModal(rowData)}>
                                    分区详情
                                </Button>
                                <Button startIcon={<TrashIcon/>} appearance="subtle"
                                        onClick={() => openDelModal(rowData.topicName)}>
                                    删除
                                </Button>
                            </div>

                        )}
                    </Cell>
                </Column>
            </Table>

            {/* 分区详情 */}
            <Modal size={"lg"}
                   open={partitionModalOpen}
                   onClose={() => setPartitionModalOpen(false)}
            >
                <Modal.Header>
                    <Modal.Title>分区详情</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Table height={325} data={partitionInfoList} loading={partitionModalLoading}>
                        <Column align={"center"} fullText width={111}>
                            <HeaderCell>分区ID</HeaderCell>
                            <Cell dataKey="partitionId"></Cell>
                        </Column>
                        <Column width={250} align={"center"} fullText>
                            <HeaderCell>Leader节点</HeaderCell>
                            <Cell dataKey="leader"></Cell>
                        </Column>
                        <Column align={"center"} fullText width={111}>
                            <HeaderCell>副本节点</HeaderCell>
                            <Cell dataKey="replicas">
                                {
                                    rowData => (
                                        <div key={rowData.partitionId}>
                                            {rowData.replicas.map((item: any) => {
                                                return <Tag color="violet">{item}</Tag>;
                                            })}
                                        </div>
                                    )
                                }
                            </Cell>
                        </Column>
                        <Column align={"center"} fullText width={111}>
                            <HeaderCell>ISR节点</HeaderCell>
                            <Cell dataKey="isr">
                                {
                                    rowData => (
                                        <div key={rowData.partitionId}>
                                            {rowData.isr.map((item: any) => {
                                                return <Tag color="violet">{item}</Tag>;
                                            })}
                                        </div>
                                    )
                                }
                            </Cell>
                        </Column>
                        <Column align={"center"} fullText width={111}>
                            <HeaderCell>Offset</HeaderCell>
                            <Cell dataKey="offset"></Cell>
                        </Column>
                        <Column align={"center"} fullText width={111}>
                            <HeaderCell>High</HeaderCell>
                            <Cell dataKey="high"></Cell>
                        </Column>
                        <Column align={"center"} fullText width={123}>
                            <HeaderCell>Low</HeaderCell>
                            <Cell dataKey="low"></Cell>
                        </Column>
                    </Table>
                </Modal.Body>
            </Modal>

            {/* 确认删除模态框 */}
            <Modal size={'xs'} open={delModalOpen} backdrop={"static"}>
                <Modal.Header>
                    <Modal.Title>删除确认</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    确定删除 {selectedTopic} 吗？
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={() => {
                        setDelModalOpen(false);
                    }} appearance="subtle">
                        取消
                    </Button>
                    <Button onClick={() => deleteTopic(selectedTopic)} appearance="primary">
                        确认
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* 新建topic表单 */}
            <Modal open={addTopicModalOpen} onClose={handleAddTopicClose} size="xs" backdrop={"static"}>
                <Modal.Header>
                    <Modal.Title>新增Topic</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form ref={formRef} fluid onChange={setTopicConfigForm} formValue={topicConfigForm} model={model}>
                        <Form.Group controlId="topic-9">
                            <Form.ControlLabel>Topic名称</Form.ControlLabel>
                            <Form.Control name="topic"/>
                        </Form.Group>
                        <Form.Group controlId="partition-9">
                            <Form.ControlLabel>分区数</Form.ControlLabel>
                            <Form.Control accepter={InputNumber} name="numPartitions"/>
                        </Form.Group>
                        <Form.Group controlId="replicationFactor-9">
                            <Form.ControlLabel>副本数</Form.ControlLabel>
                            <Form.Control accepter={InputNumber} name="replicationFactor"/>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button loading={addTopicBtnLoading} onClick={handleAddTopicSubmit} appearance="primary">
                        确定
                    </Button>
                    <Button onClick={handleAddTopicClose} appearance="subtle">
                        取消
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Topics;