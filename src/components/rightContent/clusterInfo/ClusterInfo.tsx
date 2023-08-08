import React, {useEffect, useState} from 'react';
import PubSub from "pubsub-js"
import {Admin, Kafka} from "kafkajs";
import {Loader, Table} from "rsuite";

const {Column, HeaderCell, Cell} = Table;

interface Props {
    kafkaClient?: Kafka
}

const ClusterInfo = (props: Props) => {

    const [kafkaAdmin, setKafkaAdmin] = useState<Admin>();

    const [brokers, setBrokers] = useState<Array<brokerInfo>>([]);

    const [clusterId, setClusterId] = useState<string>();

    const [tableLoading, setTableLoading] = useState(false);

    useEffect(() => {
        console.log("ClusterInfo component mount");
        if (!props.kafkaClient) {
            return;
        }
        setKafkaAdmin(() => {
            setTableLoading(true);
            const admin = props.kafkaClient?.admin();
            admin?.connect();
            admin?.describeCluster().then(res => {
                setClusterId(res.clusterId);
                setBrokers(res.brokers);
            }).finally(() => {
                setTableLoading(false);
            })
            console.log("loading end");
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
                    loading={tableLoading}
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