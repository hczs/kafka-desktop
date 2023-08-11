import React, {useEffect, useState} from 'react';
import {Consumer, Kafka} from "kafkajs";
import {Button, Col, Form, Grid, InputNumber, InputPicker, Message, Row, Stack, toaster, Toggle} from "rsuite";
import "./MessagePoll.scss";


interface Props {
    kafkaClient?: Kafka
}

const MessagePoll = (props: Props) => {

    const [msgConsumer, setMsgConsumer] = useState<Consumer>();

    const defaultSearchForm = {
        partitionId: -1,
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

    useEffect(() => {
        console.log("MessagePoll mount");
        initConsumer();
        initTopicData();
    }, [props.kafkaClient]);

    useEffect(() => {
        if (msgConsumer) {
            msgConsumer.connect().then(() => {
                console.log("msgConsumer connected");
            });
        }
        return () => {
            if (msgConsumer) {
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
                        const msg = payload.message;
                        // console.log("===消费到消息：", msg, " 分区：", payload.partition);
                        let countFlag = false;
                        // 不是全部分区 则过滤指定分区的数据
                        if (!allPartition(partition) && payload.partition === partition) {
                            console.log("[指定分区消费]消费到消息：", msg, " 分区：", payload.partition);
                            countFlag = true;
                        } else if (allPartition(partition)) {
                            console.log("[消费全部分区]消费到消息：", msg, " 分区：", payload.partition);
                            countFlag = true;
                        }
                        if (countFlag && count && --count == 0) {
                            stop();
                        }
                    }
                }).then(() => {
                    console.log("消费者已启动");
                });
                if (partition && partition !== -1 && startOffset) {
                    msgConsumer.seek({
                        topic: topic, partition: partition,
                        offset: startOffset
                    });
                }
            })
        }
    }

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
        console.log("searchFormValue: ", searchFormValue);
        setConsuming(true);
        if (searchFormValue.consumeType === 1) {
            // 实时消费
            startConsume(searchFormValue.topicName, searchFormValue.partitionId);
        } else {
            // 单次消费
            startConsume(searchFormValue.topicName, searchFormValue.partitionId, searchFormValue.offset, searchFormValue.maxCount);
        }
    }

    const resetSearchForm = () => {
        setSearchFormValue(defaultSearchForm);
    }

    return (
        <div className="message-poll-container">
            {/*<Button onClick={() => {*/}
            {/*    startConsume("test_2_3", 0, "0",20);*/}
            {/*}}>点我开始消费！！！</Button>*/}
            {/*<Button onClick={pause}>暂停</Button>*/}
            {/*<Button onClick={resume}>继续</Button>*/}
            {/*<Button onClick={seek}>seek</Button>*/}
            {/*<Button onClick={stop}>stop</Button>*/}
            <Form
                className={"msg-search-form"}
                layout={"inline"}
                formValue={searchFormValue}
                onChange={setSearchFormValue}
                disabled={consuming}
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
                    />
                    <Form.HelpText
                        tooltip>实时消费持续拉取消息，单次消费拉取指定数量后消费者自动停止</Form.HelpText>
                </Form.Group>
                <Form.Group controlId="offset" className={"group-width"}>
                    <Form.ControlLabel className={"label-width"}>Offset</Form.ControlLabel>
                    <Form.Control
                        disabled={!(searchFormValue.partitionId != -1 && !searchFormValue.fromBeginning)}
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
                        tooltip>单次消费达到该数量限制后，消费者将自动停止，不填写则默认 20 条上限</Form.HelpText>
                </Form.Group>
                <div className={"form-buttons"}>
                    <Button appearance={"primary"} onClick={consumeSubmit} loading={consuming}>拉取</Button>
                    <Button style={{marginLeft: "8px"}} onClick={stop} loading={stopping}>停止</Button>
                    <Button style={{marginLeft: "8px"}} onClick={resetSearchForm}>重置</Button>
                </div>
            </Form>
            <hr/>
        </div>
    );
};

export default MessagePoll;