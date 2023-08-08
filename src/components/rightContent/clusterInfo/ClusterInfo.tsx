import React, {useEffect, useState} from 'react';
import PubSub from "pubsub-js"
import {Admin, Kafka} from "kafkajs";
import {Table} from "rsuite";

const {Column, HeaderCell, Cell} = Table;

interface Props {
    kafkaClient?: Kafka
}

const ClusterInfo = (props: Props) => {

    const [kafkaAdmin, setKafkaAdmin] = useState<Admin>();

    const [brokers, setBrokers] = useState<Array<brokerInfo>>([]);

    const [clusterId, setClusterId] = useState<string>();

    useEffect(() => {
        console.log("ClusterInfo component mount");
        setKafkaAdmin(() => {
            const admin = props.kafkaClient?.admin();
            admin?.connect();
            admin?.describeCluster().then(res => {
                setClusterId(res.clusterId);
                setBrokers(res.brokers);
            })
            return admin;
        });
        return () => {
            console.log("[unmount] ClusterInfo component");
            kafkaAdmin?.disconnect();
            console.log("ClusterInfo admin disconnect");
        }
    }, [props.kafkaClient])

    return (
        <div className="right-panel">
            <div>
                <h5>集群ID：{clusterId}</h5>
                <br/>
                <Table
                    autoHeight={true}
                    data={brokers}
                    bordered={true}
                    cellBordered
                >
                    <Column flexGrow={1} align={"center"}>
                        <HeaderCell>节点ID</HeaderCell>
                        <Cell dataKey="nodeId"/>
                    </Column>

                    <Column flexGrow={1} align={"center"}>
                        <HeaderCell>主机地址</HeaderCell>
                        <Cell dataKey="host"/>
                    </Column>

                    <Column flexGrow={1} align={"center"}>
                        <HeaderCell>端口</HeaderCell>
                        <Cell dataKey="port"/>
                    </Column>
                </Table>
            </div>
        </div>
    );
};

export default ClusterInfo;