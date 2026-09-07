const DATABASE_NAME = 'tsa-focus-approved-questions';
const STORE_NAME = 'approved-questions';
const DATABASE_VERSION = 1;

export type ApprovedQuestionRecord = {
  id: string;
  title: string;
  answer: string;
  explanation: string;
  topics: string;
  difficulty: string;
  approvedAt: string;
};
