// test-collab.js
const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:5000';
const TRANSLATION_ID = '6813e153174ded3cfe08887f';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MTNkY2ZmOGFjYjFkNDhmODY0OWUyOSIsInJvbGUiOiJUcmFuc2xhdG9yIiwiaWF0IjoxNzQ5NTcyMTg3LCJleHAiOjE3NDk1NzM5ODd9.FdLT7LFZ5s4b5jO4uQE_OO5CS9qPQ00tI8ZkAo9qmh4';

const socket = io(SERVER_URL, {
    transports: ['polling'],
    auth: { token: TOKEN }
});

socket.on('connect', () => {
    console.log('Connected via WebSocket, joining room…');
    socket.emit('joinTranslation', TRANSLATION_ID);
    // After joining, send an edit after a short delay:
    setTimeout(() => {
        const newText = `Test edit at ${new Date().toISOString()}`;
        console.log('Emitting edit:', newText);
        socket.emit('editTranslation', {
            translationId: TRANSLATION_ID,
            newText
        });
    }, 1000);
});

socket.on('translationUpdated', ({ translationId, newText, updatedBy, updatedAt }) => {
    console.log(`Received update for ${translationId} by ${updatedBy} at ${updatedAt}:`, newText);
});

socket.on('userJoined', data => {
    console.log('userJoined event:', data);
});
socket.on('userLeft', data => {
    console.log('userLeft event:', data);
});

socket.on('connect_error', err => {
    console.error('Connection error:', err);
});

socket.on('disconnect', reason => {
    console.log('Disconnected:', reason);
});
