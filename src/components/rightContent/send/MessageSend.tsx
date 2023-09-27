import React, { ForwardedRef, useEffect, useState} from 'react';
import {Kafka, Producer} from "kafkajs";
import {Button, ButtonToolbar, Form, Input, Message, toaster} from "rsuite";
import "./MessageSend.scss";
import {send} from "vite";

interface Props {
    kafkaClient?: Kafka
}

const Textarea = React.forwardRef((props, ref) => {
    return <Input {...props} as="textarea" ref={ref as ForwardedRef<HTMLTextAreaElement>}/>
});

interface messageSendObj {

}

const MessageSend = (props: Props) => {

    const [producer, setProducer] = useState<Producer>();

    const [topicList, setTopicList] = useState<Array<string>>();

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
                const topicNames = res.topics.map(tdata => tdata.name);
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

    return (
        <div className={"msg-send-container"}>
            <Form className={"send-form"}>
                <Form.Group controlId="name">
                    <Form.ControlLabel>Username</Form.ControlLabel>
                    <Form.Control name="name"/>
                    <Form.HelpText>Username is required</Form.HelpText>
                </Form.Group>
                <Form.Group controlId="email">
                    <Form.ControlLabel>Email</Form.ControlLabel>
                    <Form.Control name="email" type="email"/>
                    <Form.HelpText tooltip>Email is required</Form.HelpText>
                </Form.Group>
                <Form.Group controlId="password">
                    <Form.ControlLabel>Password</Form.ControlLabel>
                    <Form.Control name="password" type="password" autoComplete="off"/>
                </Form.Group>
                <Form.Group controlId="textarea">
                    <Form.ControlLabel>Textarea</Form.ControlLabel>
                    <Form.Control name="textarea" accepter={Textarea}/>
                </Form.Group>
                <Form.Group>
                    <ButtonToolbar>
                        <Button appearance="primary">Submit</Button>
                        <Button appearance="default">Cancel</Button>
                    </ButtonToolbar>
                </Form.Group>
            </Form>
        </div>
    );
};

export default MessageSend;