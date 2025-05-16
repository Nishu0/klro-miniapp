import { NextRequest, NextResponse } from 'next/server';

/**
 * Handle Farcaster webhook events
 * This will be called when users add/remove the app or enable/disable notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify the request has the expected headers and payload
    if (!body.header || !body.payload || !body.signature) {
      console.error('Invalid webhook payload', body);
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }
    
    // Decode payload to get event info
    const payloadStr = Buffer.from(body.payload, 'base64').toString();
    const payload = JSON.parse(payloadStr);
    console.log('Webhook event:', payload.event);
    
    // Process different event types
    switch (payload.event) {
      case 'frame_added':
        // User added the frame and enabled notifications
        console.log('User added frame and enabled notifications');
        // Store the notification token for this user to send notifications later
        if (payload.notificationDetails) {
          // Here you would save the notification details to your database
          console.log('Notification URL:', payload.notificationDetails.url);
          console.log('Notification token:', payload.notificationDetails.token);
        }
        break;
        
      case 'frame_removed':
        // User removed the frame
        console.log('User removed frame');
        // Remove notification tokens for this user
        break;
        
      case 'notifications_enabled':
        // User enabled notifications
        console.log('User enabled notifications');
        if (payload.notificationDetails) {
          // Here you would save the notification details to your database
          console.log('Notification URL:', payload.notificationDetails.url);
          console.log('Notification token:', payload.notificationDetails.token);
        }
        break;
        
      case 'notifications_disabled':
        // User disabled notifications
        console.log('User disabled notifications');
        // Mark notification tokens as inactive
        break;
        
      default:
        console.warn('Unknown event type:', payload.event);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
