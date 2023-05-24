import { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [responses, setResponses] = useState(null);
  const [minUpdatedAt, setMinUpdatedAt] = useState('');
  const [loading, setLoading] = useState(false);


 const handleGetResponses = async () => {
    setLoading(true);
    setResponses('');
    try {
      const response = await axios.post('/api/get-responses', { apiKey, minUpdatedAt });
      setResponses(response.data.responses);
      console.log('Finished');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeyChange = event => {
    setApiKey(event.target.value);
  };
  
   const handleMinUpdatedAtChange = event => {
    setMinUpdatedAt(event.target.value);
  };

  const pacmanLoader = (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50px' }}>
    <div style={{
      width: '25px',
      height: '25px',
      borderRadius: '50%',
      background: '#0070f3',
      clipPath: 'polygon(0% 0%, 100% 0%, 50% 50%, 100% 100%, 0% 100%)',
      animation: 'loading-pacman 0.5s infinite linear'
    }} />
    <div style={{
      width: '5px',
      height: '5px',
      borderRadius: '50%',
      background: '#0070f3',
      marginLeft: '5px',
      animation: 'loading-dot 0.5s infinite linear' // Add reverse
    }} />
  </div>
);




  const bouncingBallLoader = (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '50px',
      marginTop: '20px', // Add margin-top
    }}
  >
    <div
      style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: '#0070f3',
        animation: 'loading-bounce 0.8s infinite ease-in-out',
      }}
    ></div>
  </div>
);



  return (
   <div style={{ fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ textAlign: 'center' }}>Response Fetcher</h1>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <label>
          API key:
          <input
            type="text"
            value={apiKey}
            onChange={handleApiKeyChange}
            style={{
              marginLeft: '0.5rem',
              padding: '0.25rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          />
        </label>
        <label>
          Updated after:
          <input
            type="date"
            value={minUpdatedAt}
            onChange={handleMinUpdatedAtChange}
            style={{
              marginLeft: '0.5rem',
              padding: '0.25rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          />
        </label>
      </div>
      <button
        onClick={handleGetResponses}
        style={{
          display: 'block',
          backgroundColor: '#0070f3',
          color: 'white',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          border: 'none',
          cursor: 'pointer',
          margin: '0 auto',
        }}
      >
        Get Responses
      </button>
            {loading && pacmanLoader}

      {responses && (
        <div style={{ marginTop: '2rem' }}>
          {Object.keys(responses).map(date => (
            <div key={date} style={{ backgroundColor: '#f3f3f3', borderRadius: '4px', padding: '1rem', marginBottom: '1rem' }}>
              <h2 style={{ borderBottom: '1px solid #ccc', paddingBottom: '0.5rem' }}>{date}</h2>
              {Object.keys(responses[date]).map(company => (
                <div key={company} style={{ backgroundColor: '#ffffff', borderRadius: '4px', padding: '1rem', marginBottom: '1rem' }}>
                  <h3 style={{ marginTop: '0', marginBottom: '1rem' }}>Company: {company}</h3>
                  {responses[date][company].map((response, index) => (
                    <div key={index} style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ marginBottom: '0.5rem' }}>{`Ticket ID: ${response.ticket_id}`}</h4>
                      <ReactMarkdown>{response.summary}</ReactMarkdown>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
