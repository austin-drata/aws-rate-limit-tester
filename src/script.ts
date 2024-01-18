import { DescribeDBClusterSnapshotsCommand, RDSClient } from '@aws-sdk/client-rds';

const problematicClients = ['ElasticLoadBalancingV2Client', 'APIGatewayClient', 'RDSClient'];

let requestCount = 0;
const startTime = Date.now();

const script = async () => {
  const command = new DescribeDBClusterSnapshotsCommand({});

  const client = new RDSClient({
    region: 'us-west-2',
    maxAttempts: 1,
  });

  try {
    requestCount += 1;

    const {
      $metadata: { httpStatusCode },
    } = await client.send(command);

    if (httpStatusCode !== 200) {
      console.log({ httpStatusCode });
    }
  } catch (error) {
    if ((error as any).Code === 'Throttling') {
      const endTime = Date.now();
      const secondsUntilFirstRateLimitError = (endTime - startTime - 1000) / 1000;
      console.log({
        requestCount,
        secondsUntilFirstRateLimitError,
        requestsPerSecond: requestCount / secondsUntilFirstRateLimitError,
      });
    } else {
      console.log('non-rate limit exception');
      console.log(error);
    }

    clearInterval(intervalId);
    clearTimeout(timeoutId);
  }
};

const intervalId = setInterval(
  () =>
    script().catch((err) => {
      console.log('root error');
      console.log(err);
    }),
  250
);

const timeoutId = setTimeout(() => {
  clearInterval(intervalId);
  const endTime = Date.now();
  const secondsElapsed = (endTime - startTime - 1000) / 1000;
  console.log({
    requestCount,
    secondsElapsed,
    requestsPerSecond: requestCount / secondsElapsed,
  });
}, 300000);

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    clearInterval(intervalId);
    clearTimeout(timeoutId);
    const endTime = Date.now();
    const secondsElapsed = (endTime - startTime - 1000) / 1000;
    console.log({
      requestCount,
      secondsElapsed,
      requestsPerSecond: requestCount / secondsElapsed,
    });
  });
});
