import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Success() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const activateTicket = async () => {
        const total = searchParams.get('total')
        const email_url = searchParams.get('email')
        const id = searchParams.get('user_id')
        const ticket_type_id = searchParams.get('ticket_type_id')
        const collection_id = searchParams.get('collection_id')
        const collection_status = searchParams.get('collection_status')
        const payment_id = searchParams.get('payment_id')
        const status = searchParams.get('status')
        const preference_id = searchParams.get('preference_id')
        const external_reference = searchParams.get('external_reference')
        const [userId, email] = (external_reference ?? '').split('___');
      
        const session = await supabase.auth.getSession()
        if (!session?.data?.session) {
            console.error('No session found')
            return
          }
        const { access_token } = session.data.session
        console.log(total);
        console.log(email_url);
        console.log(ticket_type_id);
        if((total == '0' || total == 0) && email_url !== ''){
          const emailResponseFree = await fetch(
            'https://qhyclhodgrlqmxdzcfgz.supabase.co/functions/v1/send-confirmation-email',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${access_token}`,
              },
              body: JSON.stringify({
                email: email,
                user_id: id,
                ticketTypeId: ticket_type_id
              }),
            }
          ); 
          if (!emailResponseFree.ok) {
            console.error('Error enviando el correo de confirmación')
          } else {
            console.log('Correo de confirmación enviado')
            navigate('/perfil')
            return;
          }
        }

        const response = await fetch('https://qhyclhodgrlqmxdzcfgz.supabase.co/functions/v1/smart-api', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
          },
          body: JSON.stringify({
            id,
            ticket_type_id,
            collection_id,
            collection_status,
            payment_id,
            status,
            preference_id,
            external_reference
          })
        })
      
        const result = await response.json()

          const emailResponse = await fetch(
            'https://qhyclhodgrlqmxdzcfgz.supabase.co/functions/v1/send-confirmation-email',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${access_token}`,
              },
              body: JSON.stringify({
                email: email,
                user_id: id,
                ticketTypeId: ticket_type_id
              }),
            }
          );      
      
          if (!emailResponse.ok) {
            console.error('Error enviando el correo de confirmación')
          } else {
            console.log('Correo de confirmación enviado')
          }
        
      
        if (!response.ok) {
          console.error(result.error || 'Error al activar ticket')
        } else {
          navigate('/perfil')
        }
      }
      

    activateTicket()
  }, [])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      flexDirection: 'column',
      textAlign: 'center'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '5px solid #ccc',
        borderTop: '5px solid #333',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{ marginTop: '1rem', fontSize: '1.2rem' }}>Procesando tu compra...</p>
  
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
