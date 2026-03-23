import { Topic } from '@icp-sdk/canisters/nns';

export type TopicGroup = {
  topic: Topic;
  labelKey: string;
  descriptionKey: string;
};

export type IndividualTopic = {
  topic: Topic;
  labelKey: string;
};

export const TOP_LEVEL_TOPICS: TopicGroup[] = [
  {
    topic: Topic.Governance,
    labelKey: 'voting.topics.governance',
    descriptionKey: 'voting.topics.governanceDesc',
  },
  {
    topic: Topic.SnsAndCommunityFund,
    labelKey: 'voting.topics.snsNeuronsFund',
    descriptionKey: 'voting.topics.snsNeuronsFundDesc',
  },
  {
    topic: Topic.Unspecified,
    labelKey: 'voting.topics.allExcept',
    descriptionKey: 'voting.topics.allExceptDesc',
  },
];

export const INDIVIDUAL_TOPICS: IndividualTopic[] = [
  { topic: Topic.ApiBoundaryNodeManagement, labelKey: 'voting.topics.apiBoundaryNode' },
  { topic: Topic.NetworkCanisterManagement, labelKey: 'voting.topics.applicationCanister' },
  { topic: Topic.ExchangeRate, labelKey: 'voting.topics.exchangeRate' },
  { topic: Topic.IcOsVersionDeployment, labelKey: 'voting.topics.icOsDeployment' },
  { topic: Topic.IcOsVersionElection, labelKey: 'voting.topics.icOsElection' },
  { topic: Topic.Kyc, labelKey: 'voting.topics.kyc' },
  { topic: Topic.NetworkEconomics, labelKey: 'voting.topics.networkEconomics' },
  { topic: Topic.NodeAdmin, labelKey: 'voting.topics.nodeAdmin' },
  { topic: Topic.NodeProviderRewards, labelKey: 'voting.topics.nodeProviderRewards' },
  { topic: Topic.ParticipantManagement, labelKey: 'voting.topics.participantManagement' },
  { topic: Topic.ProtocolCanisterManagement, labelKey: 'voting.topics.protocolCanister' },
  { topic: Topic.ServiceNervousSystemManagement, labelKey: 'voting.topics.snsManagement' },
  { topic: Topic.SubnetManagement, labelKey: 'voting.topics.subnetManagement' },
  { topic: Topic.SubnetRental, labelKey: 'voting.topics.subnetRental' },
];

export const ALL_FOLLOWABLE_TOPICS = [
  ...TOP_LEVEL_TOPICS.map((t) => t.topic),
  ...INDIVIDUAL_TOPICS.map((t) => t.topic),
];
