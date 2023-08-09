import React, {useEffect} from 'react';
import {Kafka} from "kafkajs";


interface Props {
    kafkaClient?: Kafka
}

const MessagePoll = (props: Props) => {

    useEffect(() => {
        console.log("MessagePoll mount");
        run().then(res => {
            console.log("run: ", res);
        });
    }, []);

    const run = async () => {
        if (!props.kafkaClient) {
            return;
        }
        const consumer = props.kafkaClient.consumer({groupId: "test-group"});
        await consumer.connect();
        await consumer.subscribe({topic: "test_2_3"});
        await consumer.run({
            eachMessage: async (payload) => {
                const msg = payload.message;
                console.log("消费到消息：", msg);
            }
        });
    }

    return (
        <div>

        </div>
    );
};

export default MessagePoll;