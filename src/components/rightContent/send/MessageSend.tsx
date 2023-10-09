import React, {ForwardedRef, useEffect, useState} from 'react';
import {Kafka, Producer} from "kafkajs";
import {Button, Form, Input, InputPicker, InputProps, Message, Schema, toaster} from "rsuite";
import "./MessageSend.scss";
import {FormInstance} from "rsuite/esm/Form/Form";

interface Props {
    kafkaClient?: Kafka
}

type TextAreaProps = InputProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef((props: TextAreaProps, ref) => {
    return <Input {...props} as="textarea" ref={ref as ForwardedRef<HTMLTextAreaElement>}/>
});


const MessageSend = (props: Props) => {

    const [producer, setProducer] = useState<Producer>();

    const [topicList, setTopicList] = useState<Array<{
        label: string,
        value: string
    }>>([]);

    const sendFormRef = React.createRef<FormInstance>();

    const [sendFormValue, setSendFormValue] = useState<any>({
        topic: '',
        key: '',
        messageContent: ''
    });

    const model = Schema.Model({
        topic: Schema.Types.StringType().isRequired('请选择目标Topic'),
        messageContent: Schema.Types.StringType().isRequired('请输入消息内容')
    });

    const [sendBtnLoading, setSendBtnLoading] = useState(false);

    useEffect(() => {
        console.log("MessageSend mount");
        initProducer();
        initTopicData();

        return () => {
            console.log("MessageSend return");
        }
    }, [props.kafkaClient]);

    const initProducer = () => {
        if (!props.kafkaClient) {
            return;
        }
        const producer = props.kafkaClient.producer();
        producer.connect().then(() => {
            console.log("producer 连接成功");
            setProducer(producer);
        }).catch(error => {
            console.log(error);
            toaster.push(<Message showIcon type="error">生产者启动异常，请检查网络或者集群配置信息是否正确</Message>, {
                duration: 2000
            });
        })
    }

    const initTopicData = () => {
        const admin = props.kafkaClient?.admin();
        if (!admin) {
            return;
        }
        admin.connect().then(() => {
            admin.fetchTopicMetadata().then((res) => {
                // key：topicName value: partitionList
                const topicNames = res.topics.map(tdata => {
                    return {
                        label: tdata.name,
                        value: tdata.name
                    }
                });
                setTopicList(topicNames);
                console.log("fetchTopicMetadata: ", res);
                console.log("topicNames: ", topicNames);
            });
        }).catch(() => {
            toaster.push(<Message showIcon type="error">集群连接异常，请检查网络或者集群配置信息是否正确</Message>, {
                duration: 2000
            });
        })
    }

    const sendMessage = () => {
        // 表单校验
        if (!sendFormRef.current?.check()) {
            return;
        }
        console.log("表单内容：", sendFormValue);
        setSendBtnLoading(true);
        let msgKey = null;
        if (sendFormValue.key && sendFormValue.key !== '') {
            msgKey = sendFormValue.key;
        }
        producer?.send({
            topic: sendFormValue.topic,
            messages: [{
                key: msgKey,
                value: sendFormValue.messageContent
            }]
        }).then(() => {
            toaster.push(<Message showIcon type="success">发送成功</Message>, {
                duration: 2000
            });
        }).catch(error => {
            console.log(error);
            toaster.push(<Message showIcon type="error">生产者状态异常，请检查网络或者重新连接</Message>, {
                duration: 2000
            });
        }).finally(() => {
            setSendBtnLoading(false);
        })
    }

    return (
        <div className={"msg-send-container"}>
            <Form
                ref={sendFormRef}
                fluid
                className={"send-form"}
                onChange={setSendFormValue}
                formValue={sendFormValue}
                model={model}
            >
                <Form.Group controlId="topic">
                    <Form.ControlLabel>Topic</Form.ControlLabel>
                    <Form.Control
                        className={"input-width"}
                        name="topic"
                        data={topicList}
                        accepter={InputPicker}
                    />
                    <Form.HelpText>必须选择目标Topic</Form.HelpText>
                </Form.Group>
                <Form.Group controlId="key">
                    <Form.ControlLabel>消息Key</Form.ControlLabel>
                    <Form.Control name="key"/>
                    <Form.HelpText>消息key可选</Form.HelpText>
                </Form.Group>
                <Form.Group controlId="messageContent">
                    <Form.ControlLabel>消息内容</Form.ControlLabel>
                    <Form.Control
                        name="messageContent"
                        accepter={Textarea}
                        rows={8}
                    />
                </Form.Group>
                <Form.Group>
                    <Button
                        className={"send-btn"}
                        appearance="primary"
                        onClick={sendMessage}
                        loading={sendBtnLoading}
                    >
                        发送
                    </Button>
                </Form.Group>
            </Form>
        </div>
    );
};

export default MessageSend;