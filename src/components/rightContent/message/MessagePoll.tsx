import React, { SyntheticEvent, useEffect, useState} from 'react';
import {Consumer, ITopicMetadata, Kafka} from "kafkajs";
import {Button, Form, InputNumber, InputPicker, Message, toaster} from "rsuite";
import to from "await-to-js";
import topics from "@/components/rightContent/topics/Topics";
import {ItemDataType} from "rsuite/cjs/@types/common";


interface Props {
    kafkaClient?: Kafka
}

const MessagePoll = (props: Props) => {

    const [msgConsumer, setMsgConsumer] = useState<Consumer>();

    const [searchFormValue, setSearchFormValue] = useState<any>();

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
                    v.push({label: "全部", value: -1});
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

    const startConsume = (topic: string, partition?: number, startOffset?: string, maxCount?: number) => {
        let count = maxCount;
        if (msgConsumer) {
            msgConsumer.subscribe({topic: topic, fromBeginning: true}).then(() => {
                msgConsumer.run({
                    autoCommit: false,
                    eachMessage: async (payload) => {
                        const msg = payload.message;
                        let countFlag = false;
                        // 不是全部分区 则过滤指定分区的数据
                        if (!allPartition(partition) && payload.partition === partition) {
                            console.log("消费到消息：", msg, " 分区：", payload.partition);
                            countFlag = true;
                        } else if (allPartition(partition)) {
                            console.log("消费到消息：", msg, " 分区：", payload.partition);
                            countFlag = true;
                        }
                        if (countFlag && count && --count == 0) {
                            msgConsumer.stop().then(() => {
                                console.log("消费到达maxCount，已停止");
                            });
                        }
                    }
                }).then(() => {
                    console.log("消费者已启动");
                });
                if (partition) {
                    msgConsumer.seek({
                        topic: topic, partition: partition,
                        offset: startOffset === undefined ? "0" : startOffset
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
        msgConsumer?.stop().then(() => {
            console.log("已停止消费");
        })
    }

    const topicSelect = (value: string) => {
        const ptList = topicPartitionMap?.get(value);
        setPartitionSelectData(ptList === undefined ? [] : ptList);
    }

    return (
        <div className="right-panel">
            {/*<Button onClick={() => {*/}
            {/*    startConsume("test_2_3", 0, "0",20);*/}
            {/*}}>点我开始消费！！！</Button>*/}
            {/*<Button onClick={pause}>暂停</Button>*/}
            {/*<Button onClick={resume}>继续</Button>*/}
            {/*<Button onClick={seek}>seek</Button>*/}
            {/*<Button onClick={stop}>stop</Button>*/}
            <Form className={"search-form"} layout={"inline"} formValue={searchFormValue} onChange={setSearchFormValue}>
                <Form.Group controlId="topicName">
                    <Form.ControlLabel>topic</Form.ControlLabel>
                    <Form.Control
                        name="topicName"
                        data={topicSelectData}
                        accepter={InputPicker}
                        onClean={() => setPartitionSelectData([])}
                        onChange={topicSelect}
                        defaultValue={-1}
                        width={230}
                    />
                </Form.Group>

                <Form.Group controlId="partitionId">
                    <Form.ControlLabel>分区</Form.ControlLabel>
                    <Form.Control
                        name="partitionId"
                        data={partitionSelectData}
                        accepter={InputPicker}
                        width={230}
                    />
                </Form.Group>

                <Form.Group controlId="offset">
                    <Form.ControlLabel>offset</Form.ControlLabel>
                    <Form.Control width={230} name="offset" accepter={InputNumber} />
                </Form.Group>



                <div style={{float: "right"}}>
                    {/*<Button appearance={"primary"} onClick={searchTopic}>查询</Button>*/}
                    {/*<Button style={{marginLeft: "8px"}} onClick={resetTopicTable}>重置</Button>*/}
                </div>
            </Form>
            <hr/>
        </div>
    );
};

export default MessagePoll;