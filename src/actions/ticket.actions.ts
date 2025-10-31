'use server';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/db/prisma';
import { revalidatePath } from 'next/cache';
import { logEvent } from '@/utils/sentry';


export async function createTicket(
    prevState:{ success: boolean; message: string },
     formData: FormData
    ): Promise<{ success:  boolean; message: string}> {
    try {
    
    const subject = formData.get('subject') as string;
    const description = formData.get('description') as string;
    const priority = formData.get('priority') as string;


   if (!subject || !description || !priority) {
        logEvent(
        'Validation error: missing ticket fields ', 
        'ticket',
        {subject, description, priority },

         // { formData: Object.fromEntries(formData.entries()) },
        'warning' 
        );
        return { success: false, message: 'All fields are required'};
   }

   // Create ticket
   const ticket = await prisma.ticket.create({
        data: { subject, description, priority }
   });


   Sentry.addBreadcrumb({
    category: 'ticket',
    message: `Ticket created: ${ticket.id}`,
    level: 'info',
   })

    
   Sentry.captureMessage(`Ticket was created successfully : $(ticket.id) 
    `);


  //  revalidatePath('/tickets');

    return { success: true, message: 'Ticket created successfully'};
    
    }
    catch(error) {
        Sentry.captureException(error as Error, {
            extra: { formData: Object.fromEntries(formData.entries()) },
        });
        return { 
            success: false,
             message: 'An error occured while creating the ticket',
            };
    
}
}


export async function getTickets() {
    try {
        const tickets = await prisma.ticket.findMany({
            orderBy: { createdAt: 'desc' }
        });

        logEvent('Fetched ticket list', 'ticket', {
            count: tickets.length }, 'info');
        return tickets;
    } catch(error) {
        logEvent('Error fetching tickets', 'tickets', {}, 'error', error);

        return [];
    }
}


export async function getTicketById(id: string) {
    try {
const ticket = await prisma.ticket.findUnique({
            where: { id: Number(id) } 
   });
   if(!ticket) {
    logEvent('Ticket not found', 'ticket', { ticketId: id}, 'warning')
   }
   return ticket;

 } catch (error) {
     logEvent('Error fetching ticket details', 'ticket', { ticketId: id}, 'error', error);
    }
    return null;
 }
