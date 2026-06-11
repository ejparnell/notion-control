const graph = new StateGraph(EmailAgentState)
  .addNode('loadLabels', loadLabels)
  .addNode('fetchInbox', fetchInbox)
  .addNode('classifyEmails', classifyEmails)
  .addNode('summarizeBatch', summarizeBatch)
  .addNode('applyActions', applyActions)

  .addEdge(START, 'loadLabels')
  .addEdge('loadLabels', 'fetchInbox')
  .addEdge('fetchInbox', 'classifyEmails')
  .addEdge('classifyEmails', 'summarizeBatch')
  .addEdge('summarizeBatch', END)

  .compile()