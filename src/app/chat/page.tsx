'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Typography, Button, Box } from '@mui/material';
import ChatRoom from '../../components/ChatRoom';
import { userAPI } from '../../services/api';
import type { User } from '../../types';


export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem('chatUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      router.push('/');
    }
  }, [router]);

  const handleLogout = async () => {
    if (user) {
      try {
        await userAPI.logout(user.id);
      } catch (error) {
        console.error('Logout error:', error);
      }
      localStorage.removeItem('chatUser');
      router.push('/');
    }
  };

  if (!user) {
    return (
      <Container>
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6">Loading...</Typography>
        </Box>
      </Container>
    );
  }

  return <ChatRoom user={user} onLogout={handleLogout} />;
}