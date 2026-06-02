import { Message, toaster } from 'rsuite';

// Essa função aceita o tipo ('success', 'error', 'info', 'warning') e a mensagem
export const notify = (type, content) => {
  toaster.push(
    <Message showIcon type={type} closable>
      {content}
    </Message>,
    { placement: 'topEnd', duration: 4000 } // Aparece no canto superior direito
  );
};