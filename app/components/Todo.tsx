import { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Input,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

export default function Todo() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [input, setInput] = useState('');
  const toast = useToast();
  const notificationSound = new Audio('/notification.mp3');

  const handleAddTodo = () => {
    if (input.trim() !== '') {
      const todo: TodoItem = {
        id: Date.now(),
        text: input,
        completed: false
      };
      setTodos([...todos, todo]);
      setInput('');
      notificationSound.play();
      toast({
        title: 'Görev eklendi',
        description: 'Yeni görev başarıyla eklendi!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box p={4}>
      <VStack gap={4}>
        <Text fontSize="2xl">Yapılacaklar Listesi</Text>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Yapılacak bir şey ekle..."
        />
        <Button onClick={handleAddTodo} colorScheme="blue">
          Ekle
        </Button>
      </VStack>

      <VStack gap={4} w="100%">
        {todos.map((todo) => (
          <Box
            key={todo.id}
            p={3}
            w="100%"
            borderWidth={1}
            borderRadius="md"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text>{todo.text}</Text>
          </Box>
        ))}
      </VStack>
    </Box>
  );
} 