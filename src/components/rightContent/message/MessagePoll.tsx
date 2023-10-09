import React, {useEffect, useState} from 'react';
import {Consumer, Kafka} from "kafkajs";
import {
    Button,
    Form,
    InputNumber,
    InputPicker,
    Message,
    Modal,
    Schema,
    Table, Tag,
    toaster,
    Toggle
} from "rsuite";
import "./MessagePoll.scss";
import {FormInstance} from "rsuite/esm/Form/Form";
import InfoOutlineIcon from "@rsuite/icons/InfoOutline";
import {RowDataType} from "rsuite/Table";
import ReactJson from 'react-json-view';
import moment from "moment";
import {SortType} from "rsuite-table/src/@types/common";

const {Column, HeaderCell, Cell} = Table;

interface Props {
    kafkaClient?: Kafka
}

interface MessageInfo {
    partitionId: number,
    offset: string,
    key: string | undefined,
    value: string | undefined,
    timestamp: string
}

const MessagePoll = (props: Props) => {

    const [msgConsumer, setMsgConsumer] = useState<Consumer>();

    const defaultSearchForm = {
        topicName: '',
        fromBeginning: true,
        consumeType: 1,
    }

    const [searchFormValue, setSearchFormValue] = useState<any>(defaultSearchForm);

    const [topicPartitionMap, setTopicPartitionMap] = useState<Map<string, Array<{
        label: string,
        value: number
    }>>>();

    const [topicSelectData, setTopicSelectData] = useState<Array<{
        label: string,
        value: string
    }>>([]);

    const [partitionSelectData, setPartitionSelectData] = useState<Array<{
        label: string,
        value: number
    }>>([]);

    const [consuming, setConsuming] = useState(false);

    const [stopping, setStopping] = useState(false);

    const formRef = React.createRef<FormInstance>();

    const consumeTypeSelectData = [
        {
            label: "实时消费",
            value: 1
        },
        {
            label: "单次消费",
            value: 2
        },
    ]

    const model = Schema.Model({
        topicName: Schema.Types.StringType().isRequired('请选择要消费的 Topic'),
        partitionId: Schema.Types.NumberType().isRequired('请选择要消费的分区')
    });

    const [messageList, setMessageList] = useState<Array<MessageInfo>>([]);

    const [messageInfo, setMessageInfo] = useState<any>();

    const [msgInfoModalOpen, setMsgInfoModalOpen] = useState<boolean>(false);

    // 当前排序列
    const [sortColumn, setSortColumn] = React.useState<string>();

    // 当前排序类型
    const [sortType, setSortType] = React.useState<SortType>();

    const [tableLoading, setTableLoading] = useState<boolean>(false);

    useEffect(() => {
        console.log("MessagePoll mount");
        initConsumer();
        initTopicData();

        return () => {
            console.log("kafkaClient return");
        }
    }, [props.kafkaClient]);

    useEffect(() => {
        if (msgConsumer) {
            msgConsumer.connect().then(() => {
                console.log("msgConsumer connected");
            });
        }
        return () => {
            console.log("msgConsumer return");
            if (msgConsumer) {
                msgConsumer?.stop().then(() => {
                    console.log("已停止消费");
                    setConsuming(false);
                    setStopping(false);
                })
                msgConsumer.disconnect().then(() => {
                    console.log("msgConsumer disconnect");
                });

            }
        }
    }, [msgConsumer]);

    const initConsumer = () => {
        if (!props.kafkaClient) {
            return;
        }
        const consumer = props.kafkaClient.consumer({groupId: "kafka-desktop"});
        setMsgConsumer(consumer);
    }

    const initTopicData = () => {
        const admin = props.kafkaClient?.admin();
        if (!admin) {
            return;
        }
        admin.connect().then(() => {
            admin.fetchTopicMetadata().then((res) => {
                // key：topicName value: partitionList
                const topicPartitionMapRes = new Map(
                    res.topics.map(item =>
                        [item.name, item.partitions.map(ptInfo =>
                            ({label: ptInfo.partitionId.toString(), value: ptInfo.partitionId}))
                        ]));
                topicPartitionMapRes.forEach((v, _) => {
                    v.unshift({label: "全部", value: -1});
                })
                const topicSelectData = res.topics.map(item => ({
                    label: item.name,
                    value: item.name
                }));
                setTopicPartitionMap(topicPartitionMapRes);
                setTopicSelectData(topicSelectData);
            });
        }).catch(() => {
            toaster.push(<Message showIcon type="error">集群连接异常，请检查网络或者集群配置信息是否正确</Message>, {
                duration: 2000
            });
        })
    }

    const allPartition = (partition?: number) => {
        return partition && partition === -1;
    }

    const startConsume = (topic: string, partition: number, startOffset?: string, maxCount?: number) => {
        let count = maxCount;
        if (msgConsumer) {
            msgConsumer.subscribe({topic: topic, fromBeginning: searchFormValue.fromBeginning}).then(() => {
                msgConsumer.run({
                    autoCommit: false,
                    eachMessage: async (payload) => {
                        // console.log("payload: ", payload);
                        if (payload.topic !== searchFormValue.topicName) {
                            return;
                        }
                        const msg = payload.message;
                        let countFlag = false;
                        // 不是全部分区 则过滤指定分区的数据
                        if (!allPartition(partition) && payload.partition === partition) {
                            // console.log("[指定分区消费]消费到消息：", msg, " 分区：", payload.partition);
                            countFlag = true;
                        } else if (allPartition(partition)) {
                            // console.log("[消费全部分区]消费到消息：", msg, " 分区：", payload.partition);
                            countFlag = true;
                        }
                        if (countFlag) {
                            await processMessage(payload.partition, msg);
                        }
                        if (countFlag && count && --count == 0) {
                            stop();
                        }
                    }
                }).then(() => {
                    toaster.push(<Message showIcon type="success">消费者已启动</Message>, {
                        duration: 2000
                    });
                });
                // 选择分区 不是选择的全部分区 并且设置了起始offset 并且不是从头开始消费 设置消费开始的offset
                if (partition !== undefined && partition !== -1 && startOffset && !searchFormValue.fromBeginning) {
                    msgConsumer.seek({
                        topic: topic, partition: partition,
                        offset: startOffset
                    });
                } else if (partition !== undefined && partition !== -1) {
                    // 其他情况 单分区消费 需要重新seek offset
                    msgConsumer.seek({
                        topic: topic, partition: partition,
                        offset: '0'
                    });
                }
            })
        }
    }

    const processMessage = async (partitionId: number, message: any) => {
        setMessageList(oldList => [
            ...oldList,
            {
                partitionId: partitionId,
                offset: message.offset,
                key: message.key?.toString(),
                value: message.value?.toString(),
                timestamp: moment(new Date(Number(message.timestamp))).format("YYYY-MM-DD HH:mm:ss"),
            }
        ]);

        // 处理完消息后立即释放
        await new Promise(resolve => setTimeout(resolve, 0));
    };

    const pause = () => {
        msgConsumer?.pause([{topic: "test_2_3", partitions: [0]}]);
    }

    const resume = () => {
        msgConsumer?.resume([{topic: "test_2_3", partitions: [0]}]);
    }

    const seek = () => {
        msgConsumer?.seek({topic: "test_2_3", partition: 1, offset: "0"});
    }

    const stop = () => {
        setStopping(true);
        msgConsumer?.stop().then(() => {
            console.log("已停止消费");
            setConsuming(false);
            setStopping(false);
            toaster.push(<Message showIcon type="success">已停止消费</Message>, {
                duration: 2000
            });
        })
    }

    const topicSelect = (value: string) => {
        const ptList = topicPartitionMap?.get(value);
        setPartitionSelectData(ptList === undefined ? [] : ptList);
        setSearchFormValue((oldForm: any) => {
            oldForm.partitionId = -1
            return oldForm;
        });
        console.log(searchFormValue);
    }

    const consumeSubmit = () => {
        // 表单校验
        if (!formRef.current?.check()) {
            return;
        }
        setMessageList([]);
        console.log("searchFormValue: ", searchFormValue);
        setConsuming(true);
        if (searchFormValue.consumeType === 1) {
            // 实时消费
            startConsume(searchFormValue.topicName, searchFormValue.partitionId, searchFormValue.offset);
        } else {
            // 单次消费
            startConsume(searchFormValue.topicName, searchFormValue.partitionId, searchFormValue.offset, searchFormValue.maxCount);
        }
    }

    const resetSearchForm = () => {
        setSearchFormValue(defaultSearchForm);
        setPartitionSelectData([]);
        setMessageList([]);
    }

    const openMessageInfoModal = (rowData: RowDataType<never>) => {
        try {
            const msgObj = JSON.parse(rowData.value);
            if (msgObj instanceof Object) {
                setMessageInfo(msgObj);
            } else {
                setMessageInfo(rowData.value);
            }
        } catch (error) {
            setMessageInfo(rowData.value);
        }
        setMsgInfoModalOpen(true);
    }

    const handleMsgInfoModalClose = () => {
        setMsgInfoModalOpen(false);
    }

    const sortTableData = (dataKey: string, sortType?: SortType) => {
        if (consuming) {
            toaster.push(<Message showIcon type="info">请先停止消费者，再进行排序操作</Message>, {
                duration: 2000
            });
            return;
        }
        setTableLoading(true);
        setSortColumn(dataKey);
        setSortType(sortType);
        const numberKey = ["partitionId", "offset"];
        console.log(dataKey + sortType);
        setMessageList(messageList.sort((msg1, msg2) => {
            const fieldKey = dataKey as keyof typeof msg1;
            let v1 = msg1[fieldKey];
            let v2 = msg2[fieldKey];
            if (numberKey.indexOf(dataKey) >= 0) {
                v1 = v1 as number;
                v2 = v2 as number;
                // 解决 sort 0 干扰
                if (v1 == 0 && v2 != 0) {
                    v1 += 1;
                    v2 += 1;
                }
                if (v2 == 0 && v1 != 0) {
                    v2 += 1;
                    v1 += 1;
                }
                if (sortType === "desc" && v1 && v2) {
                    return v2 - v1;
                } else {
                    return v1 - v2;
                }
            } else if (dataKey === "timestamp" && v1 && v2) {
                if (sortType === "desc") {
                    return Date.parse(v2 as string) - Date.parse(v1 as string);
                } else {
                    return Date.parse(v1 as string) - Date.parse(v2 as string);
                }
            }
            return 0;
        }));
        setTableLoading(false);
    }

    return (
        <div className="message-poll-container">
            <Modal
                keyboard={false}
                open={msgInfoModalOpen}
                onClose={handleMsgInfoModalClose}
                size={"lg"}
            >
                <Modal.Header>
                    <Modal.Title>消息详情</Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <div>
                        {
                            messageInfo instanceof Object ?
                                <ReactJson
                                    src={messageInfo}
                                    theme={"monokai"}
                                    style={{fontFamily: "'LXGWWenKaiMono-Bold', sans-serif"}}></ReactJson>
                                : <div className={"txt-view"}>
                                    {messageInfo}
                                </div>
                        }
                    </div>
                </Modal.Body>
            </Modal>

            <Form
                ref={formRef}
                className={"msg-search-form"}
                layout={"inline"}
                formValue={searchFormValue}
                onChange={setSearchFormValue}
                disabled={consuming}
                model={model}
            >
                <Form.Group controlId="topicName" className={"group-width"}>
                    <Form.ControlLabel className={"label-width"}>Topic</Form.ControlLabel>
                    <Form.Control
                        className={"input-width"}
                        name="topicName"
                        data={topicSelectData}
                        accepter={InputPicker}
                        onClean={() => setPartitionSelectData([])}
                        onChange={topicSelect}
                    />
                </Form.Group>
                <Form.Group controlId="partitionId" className={"group-width"}>
                    <Form.ControlLabel className={"label-width"}>分区</Form.ControlLabel>
                    <Form.Control
                        className={"input-width"}
                        name="partitionId"
                        data={partitionSelectData}
                        accepter={InputPicker}
                    />
                </Form.Group>
                <Form.Group controlId="fromBeginning" className={"group-width"}>
                    <Form.ControlLabel className={"label-width"}>FromBeginning</Form.ControlLabel>
                    <Form.Control
                        className={"input-width"}
                        name="fromBeginning"
                        accepter={Toggle}
                        checked={searchFormValue.fromBeginning}
                    />
                    <Form.HelpText
                        tooltip>开启则代表从topic最早的位点开始消费，不开启则会从最近的位点开始消费</Form.HelpText>
                </Form.Group>
                <Form.Group controlId="consumeType" className={"group-width"}>
                    <Form.ControlLabel className={"label-width"}>消费类型</Form.ControlLabel>
                    <Form.Control
                        className={"input-width"}
                        name="consumeType"
                        accepter={InputPicker}
                        data={consumeTypeSelectData}
                        cleanable={false}
                    />
                    <Form.HelpText
                        tooltip>实时消费持续拉取消息，单次消费拉取指定数量后消费者自动停止</Form.HelpText>
                </Form.Group>
                <Form.Group controlId="offset" className={"group-width"}>
                    <Form.ControlLabel className={"label-width"}>Offset</Form.ControlLabel>
                    <Form.Control
                        disabled={!(searchFormValue.partitionId != -1 && !searchFormValue.fromBeginning) || consuming}
                        className={"input-width"}
                        name="offset"
                        accepter={InputNumber}
                    />
                    <Form.HelpText
                        tooltip>设置在该分区消费的起始offset，不设置则默认从最新的offset开始消费</Form.HelpText>
                </Form.Group>
                <Form.Group controlId="maxCount" className={"group-width"}>
                    <Form.ControlLabel className={"label-width"}>消息数量限制</Form.ControlLabel>
                    <Form.Control
                        disabled={searchFormValue.consumeType != 2}
                        className={"input-width"}
                        name="maxCount"
                        accepter={InputNumber}
                    />
                    <Form.HelpText
                        tooltip>单次消费达到该数量限制后，消费者将自动停止，不填写则默认 20
                        条上限，实时消费无消息上限</Form.HelpText>
                </Form.Group>
                <div className={"form-buttons"}>
                    <Button appearance={"primary"} onClick={consumeSubmit} loading={consuming}>拉取</Button>
                    <Button style={{marginLeft: "8px"}} onClick={stop} loading={stopping}>停止</Button>
                    <Button style={{marginLeft: "8px"}} onClick={resetSearchForm}
                            disabled={consuming || stopping}>重置</Button>
                </div>
            </Form>
            <Table
                onSortColumn={sortTableData}
                sortColumn={sortColumn}
                sortType={sortType}
                fillHeight
                bordered={false}
                cellBordered={false}
                data={messageList}
                loading={tableLoading}
            >
                <Column align="center" flexGrow={1} sortable>
                    <HeaderCell>分区</HeaderCell>
                    <Cell dataKey="partitionId"/>
                </Column>
                <Column align="center" flexGrow={1} sortable>
                    <HeaderCell>Offset</HeaderCell>
                    <Cell dataKey="offset"/>
                </Column>
                <Column align="center" flexGrow={1}>
                    <HeaderCell>Key</HeaderCell>
                    <Cell dataKey="key"/>
                </Column>
                <Column align="center" flexGrow={1}>
                    <HeaderCell>Value</HeaderCell>
                    <Cell dataKey="value"/>
                </Column>
                <Column align="center" width={200} sortable>
                    <HeaderCell>Timestamp</HeaderCell>
                    <Cell dataKey="timestamp"/>
                </Column>
                <Column flexGrow={1} fixed="right">
                    <HeaderCell>操作</HeaderCell>
                    <Cell style={{padding: '6px'}}>
                        {rowData => (
                            <div>
                                <Button startIcon={<InfoOutlineIcon/>} appearance="subtle"
                                        onClick={() => openMessageInfoModal(rowData)}>
                                    消息详情
                                </Button>
                            </div>

                        )}
                    </Cell>
                </Column>
            </Table>
            <Tag color="blue" style={{marginTop: "10px"}}>当前数据条数：{messageList.length}</Tag>
        </div>
    );
};

export default MessagePoll;