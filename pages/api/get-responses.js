import axios from 'axios';
import { Configuration, OpenAIApi } from "openai";
import groupBy from 'lodash.groupby';


const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
  const openai = new OpenAIApi(configuration);

async function getCompanies(apiUrl, apiKey) {
  let companies = [];
  let page = 1;

  while (true) {
    const response = await axios.get(`${apiUrl}?page=${page}`, {
      auth: {
        username: apiKey,
        password: 'x'
      }
    });

    const data = response.data;

    if (data.length === 0) {
      break;
    }

    const currentCompanies = data.map(company => ({
      id: company.id,
      name: company.name
    }));

    companies.push(...currentCompanies);
    page++;
  }

  return companies;
}

async function getIdsFromApi(apiUrl, apiKey, companies) {
  const response = await axios.get(apiUrl, {
    auth: {
      username: apiKey,
      password: 'x'
    }
  });
  
  const data = response.data.results;
  const ids = data.map(ticket => {
    const companyName = companies.find(company => company.id === ticket.company_id)?.name || 'Unknown';
    return {
      id: ticket.id,
      company: companyName
    };
  });
  return ids;
}

async function getConversationsFromIds(apiUrl, apiKey, ids, minUpdatedAt) {
  const conversations = [];

  for (const { id, company } of ids) {
    let page = 1;

    while (true) {
      const response = await axios.get(`${apiUrl}/${id}/conversations`, {
        params: { page },
        auth: {
          username: apiKey,
          password: 'x'
        }
      });
     
      const data = response.data;
      const currentConversations = data.filter(conversation => conversation.created_at > minUpdatedAt).map(conversation => (
        {"body_text": conversation.body_text, 
         "ticket_id": conversation.ticket_id, 
         "created_at": conversation.created_at.substring(0, 10),
         "company": company, // Add the company name to the response
          "from": conversation.from_email == null ? 'client' : (conversation.from_email).includes('syssero') ? `agent - ${conversation.from_email}` : `client - ${conversation.from_email}`
        }
      ));
      conversations.push(...currentConversations);

      if (currentConversations.length === 0) {
        break;
      }

      page++;
    }
  }
  
  let phrases = ["thanks", "best regards", "happy Monday", "happy Friday", "cheers","thank you!","have a great","have a good","enjoy your"];
let pattern = phrases.map(phrase => phrase.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&')).join('|');
let regex = new RegExp(`\\s*(?:${pattern})[\\s\\S]*`, 'im');

  const groupedMessages = conversations.reduce((acc, message) => {
  const existingGroup = acc.find(group => group.ticket_id === message.ticket_id && group.created_at === message.created_at);
  if (existingGroup) {
    existingGroup.body_text += `from: ${message.from}\n${message.body_text.trim()}\n//end of message//\n`;
  } else {
    acc.push({
      body_text: `from: ${message.from}\n${message.body_text.trim()}\n//end of message//\n`,
      ticket_id: message.ticket_id,
      created_at: message.created_at,
      company: message.company
    });
  }
  return acc;
}, []);
  //console.log(groupedMessages)
  return groupedMessages;
}

async function getResponses(apiUrl, conversationUrl, apiKey, minUpdatedAt) {
  const companies = await getCompanies('https://syssero.freshdesk.com/api/v2/companies', apiKey);
  const ids = await getIdsFromApi(apiUrl, apiKey, companies);
  const conversations = await getConversationsFromIds(conversationUrl, apiKey, ids, minUpdatedAt);
  const responses = [];
  
  


  for (const conversation of conversations) {
    const prompt = `summarize the following service ticket messages from the point of view of the service agent in less than 100 words. Ignore anything that the client said unless it makes sense in the context of what the agent did or mentioned.If there are no agent comments, say "No action or comment by agent". Call agents just by their name, don't say "agent <name of agent>, same with clients". Use bullet points. Answer as markdown.

Start of Messages for ticket ${conversation.ticket_id} on ${conversation.created_at}:

${conversation.body_text}
  
  `
    const response = await openai.createChatCompletion({
    model: 'gpt-4',
    messages: [
  {"role": "user", "content": prompt}
],
    //max_tokens: 1000, // Choose the max allowed tokens in completion
    temperature: 0.3, // Set to 0 for deterministic results
  })

    if(response.data.error){
console.log('Error message:', response.data.error);
    }


    //console.log(response.data.choices[0].message.content)
    
    const responseObject = {
      conversation_original: conversation.body_text,
      summary: response.data.choices[0].message.content,
      date: conversation.created_at,
      ticket_id: conversation.ticket_id,
      company: conversation.company
    };

    
    responses.push(responseObject);
  }

  return responses;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { apiKey, minUpdatedAt } = req.body;

  if (!apiKey) {
    res.status(400).json({ message: 'API key is required' });
    return;
  }

  try {
    const responses = await getResponses(
      `https://syssero.freshdesk.com/api/v2/search/tickets?query="updated_at:>\'${minUpdatedAt}\' AND agent_id:42015009243"`,
      'https://syssero.freshdesk.com/api/v2/tickets',
      apiKey,
    minUpdatedAt
    );

    const groupedResponses = groupBy(responses, 'date');
    // for (const date in groupedResponses) {
    //   groupedResponses[date] = groupBy(groupedResponses[date], 'ticket_id');
    // }
for (const date in groupedResponses) {
      groupedResponses[date] = groupBy(groupedResponses[date], 'company');
    }
    //console.log(groupedResponses['2023-04-21']['TRG']);
    res.status(200).json({ responses: groupedResponses });
   
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
