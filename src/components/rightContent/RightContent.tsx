import React, {useEffect, useState} from 'react';
import {Loader, Message, Nav, Panel, toaster} from "rsuite";
import ClusterInfo from "@/components/rightContent/clusterInfo/ClusterInfo";
import Topics from "@/components/rightContent/topics/Topics";
import PubSub from "pubsub-js";

const {Kafka} = require('kafkajs');
import "./RightContent.scss";
import MessagePoll from "@/components/rightContent/message/MessagePoll";


const RightContent = () => {
    const [activeTab, setActiveTab] = useState<string>('clusterInfo');

    // 当前连接的 Kafka 连接对象
    const [kafkaClient, setKafkaClient] = useState<any>();

    const [loading, setLoading] = useState<boolean>(false);

    const selectItem = (eventKey: string | undefined) => {
        console.log(eventKey);
        if (eventKey !== undefined) {
            setActiveTab(eventKey);
        }
    }

    const renderTab = () => {
        switch (activeTab) {
            case "clusterInfo":
                return <ClusterInfo kafkaClient={kafkaClient}></ClusterInfo>;
            case "topics":
                return <Topics kafkaClient={kafkaClient}></Topics>;
            case "message":
                return <MessagePoll kafkaClient={kafkaClient}></MessagePoll>
        }
    }

    const clusterInfoConsumer = (msg: any, data: any) => {
        console.log("msg: ", msg, "data: ", data);
        setLoading(true);
        const tmpClient = new Kafka({
            clientId: data.clientName,
            brokers: data.brokers.split(','),
            // 后续做到界面上 可配
            retry: {
                initialRetryTime: 100,
                maxRetryTime: 1000,
                retries: 3
            }
        });
        const testAdmin = tmpClient.admin();
        testAdmin.connect().then(() => {
            toaster.push(<Message showIcon type="success">连接成功！</Message>, {
                duration: 2000
            });
            // 初始化 kafka 连接对象 开始连接
            setKafkaClient(tmpClient);
        }).catch(() => {
            toaster.push(<Message showIcon type="error">集群连接异常，请检查配置信息是否正确</Message>, {
                duration: 2000
            });
        }).finally(() => {
            if (testAdmin) {
                testAdmin.disconnect();
            }
            setLoading(false);
        })

    }

    useEffect(() => {
        console.log("RightContent component mount");
        const token = PubSub.subscribe("clusterInfoTopic", clusterInfoConsumer);
        return () => {
            console.log("[unmount] RightContent component");
            PubSub.unsubscribe(token);
        }
    }, [])

    return (
        <div className='right-container'>
            {
                loading &&
                <Loader style={{zIndex: 999}} backdrop content="集群连接中" vertical size={"sm"}/>
            }
            <Nav appearance="tabs" activeKey={activeTab} justified>
                <Nav.Item eventKey="clusterInfo" onSelect={selectItem}>集群信息</Nav.Item>
                <Nav.Item eventKey="topics" onSelect={selectItem}>Topic 管理</Nav.Item>
                <Nav.Item eventKey="message" onSelect={selectItem}>消息查询</Nav.Item>
            </Nav>

            <div className='content-panel-container'>
                {renderTab()}
            </div>
        </div>
    );
};

export default RightContent;