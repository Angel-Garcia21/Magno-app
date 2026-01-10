import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Register Poppins for premium look
Font.register({
    family: 'Poppins',
    fonts: [
        { src: 'https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-400-normal.ttf', fontWeight: 400 },
        { src: 'https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-400-italic.ttf', fontWeight: 400, fontStyle: 'italic' },
        { src: 'https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-600-normal.ttf', fontWeight: 600 },
        { src: 'https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-700-normal.ttf', fontWeight: 700 },
        { src: 'https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-900-normal.ttf', fontWeight: 900 },
        { src: 'https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-900-italic.ttf', fontWeight: 900, fontStyle: 'italic' }
    ]
});

const styles = StyleSheet.create({
    page: {
        padding: 0, // Reset padding for sidebar
        fontFamily: 'Poppins',
        backgroundColor: '#FFFFFF',
        color: '#1a1a1a',
        position: 'relative'
    },
    sidebarBlue: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 35,
        backgroundColor: '#0026e3',
        zIndex: 10,
        borderLeft: '2pt solid #001999'
    },
    headerAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 200,
        height: 180,
        zIndex: -1
    },
    contentWrapper: {
        padding: '30 60 30 50', // Accommodate sidebar
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 20,
        position: 'relative'
    },
    logo: {
        width: 60,
        height: 60,
        objectFit: 'contain'
    },
    firmaText: {
        fontSize: 32,
        fontWeight: 900,
        color: '#D4AF37', // Gold
        letterSpacing: 2,
        textTransform: 'uppercase'
    },
    headerTitle: {
        fontSize: 10,
        fontWeight: 800,
        color: '#1e293b',
        textTransform: 'uppercase',
        marginTop: 5,
        letterSpacing: 0.5
    },
    folioContainer: {
        position: 'absolute',
        right: 50,
        top: 60,
        flexDirection: 'row',
        alignItems: 'center'
    },
    folioText: {
        fontSize: 10,
        fontWeight: 900,
        color: '#1e293b'
    },
    section: {
        marginTop: 15,
        marginBottom: 10
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 900,
        color: '#1e293b',
        textTransform: 'uppercase',
        marginBottom: 8,
        borderLeftColor: '#0026e3'
    },
    fieldRow: {
        flexDirection: 'row',
        marginBottom: 4,
        alignItems: 'baseline'
    },
    label: {
        fontSize: 9,
        fontWeight: 400,
        color: '#1e293b',
        width: '35%'
    },
    value: {
        fontSize: 9,
        fontWeight: 900,
        color: '#000',
        flex: 1
    },
    // For large spacing text areas
    textArea: {
        fontSize: 9,
        fontWeight: 400,
        color: '#1e293b',
        marginTop: 4,
        fontStyle: 'italic',
        lineHeight: 1.4
    },
    observationsValue: {
        fontSize: 10,
        fontWeight: 900,
        fontStyle: 'italic'
    },
    legalText: {
        fontSize: 8,
        fontWeight: 400,
        color: '#1e293b',
        lineHeight: 1.4,
        textAlign: 'justify'
    },
    signSection: {
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    signBox: {
        width: '45%'
    },
    qrPlaceholder: {
        width: 100,
        height: 100,
        backgroundColor: '#f1f5f9',
        border: '1pt dashed #cbd5e1',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 50,
        right: 65,
        borderTop: '0.5pt solid #cbd5e1',
        paddingTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15
    },
    footerIconText: {
        fontSize: 8,
        color: '#64748b',
        flexDirection: 'row',
        alignItems: 'center'
    },
    watermark: {
        position: 'absolute',
        top: '30%',
        left: '20%',
        width: 400,
        height: 400,
        opacity: 0.03,
        zIndex: -2
    }
});

// Reusable Section Component
const FormSection = ({ title, children }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {children}
    </View>
);

interface RecruitmentPDFProps {
    data: any;
    mode: 'rent' | 'sale';
}

const RecruitmentPDF: React.FC<RecruitmentPDFProps> = ({ data, mode }) => {
    const date = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    const contactEmail = data.contact_email || data.email || '';
    const contactPhone = data.contact_phone || data.phone || '';
    const ownerName = data.ownerName || data.contact_name || '';

    // Robust extraction fallback
    const occupancyStatus = data.occupancy_status || data.form_data?.occupancy_status || '';
    const ageStatus = data.age_status || data.form_data?.age_status || '';
    const ageYears = data.age_years || data.form_data?.age_years || '';
    const isFreeOfEncumbrance = data.is_free_of_encumbrance ?? data.form_data?.is_free_of_encumbrance;

    return (
        <Document>
            {/* PAGE 1: OWNER & PROPERTY INFO */}
            <Page size="A4" style={styles.page}>
                <View style={styles.sidebarBlue} />
                <Image src={window.location.origin + "/assets/magno-logo.png"} style={styles.watermark} />

                <View style={styles.contentWrapper}>
                    <View style={styles.header}>
                        <Image src={window.location.origin + "/assets/magno-logo.png"} style={styles.logo} />
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.firmaText}>FIRMA</Text>
                            <Text style={[styles.headerTitle, { fontWeight: 900 }]}>
                                {mode === 'rent' ? 'FORMATO INTEGRAL PARA EL MANEJO DE ARRENDAMIENTO' : 'FORMATO INTEGRAL PARA EL MANEJO DE VENTA'}
                            </Text>
                        </View>

                        <View style={styles.folioContainer}>
                            <Text style={styles.folioText}>FOLIO: {data.ref || data.folio || 'PENDIENTE'}</Text>
                        </View>
                    </View>

                    <View style={{ marginTop: 20 }}>
                        <FormSection title="INFORMACIÓN DEL PROPIETARIO">
                            <View style={[styles.fieldRow, { marginBottom: 15 }]}>
                                <Text style={styles.label}>Nombre completo:</Text>
                                <Text style={styles.value}>{ownerName}</Text>
                            </View>
                            <View style={[styles.fieldRow, { marginBottom: 15 }]}>
                                <Text style={styles.label}>Correo electrónico:</Text>
                                <Text style={styles.value}>{contactEmail}</Text>
                            </View>
                            <View style={[styles.fieldRow, { marginBottom: 15 }]}>
                                <Text style={styles.label}>Teléfono:</Text>
                                <Text style={styles.value}>{contactPhone}</Text>
                            </View>
                            <View style={[styles.fieldRow, { marginBottom: 15 }]}>
                                <Text style={styles.label}>Ubicación escrita del inmueble:</Text>
                                <Text style={styles.value}>{data.address || ''}</Text>
                            </View>
                        </FormSection>

                        <View style={{ marginTop: 40 }}>
                            <FormSection title="INFORMACIÓN DE LA PROPIEDAD">
                                <View style={[styles.fieldRow, { marginBottom: 15 }]}>
                                    <Text style={styles.label}>Estado general del inmueble:</Text>
                                    <Text style={styles.value}>{occupancyStatus}</Text>
                                </View>
                                <View style={[styles.fieldRow, { marginBottom: 15 }]}>
                                    <Text style={styles.label}>Antigüedad aproximada:</Text>
                                    <Text style={styles.value}>{(ageStatus === 'Años' || ageStatus === 'Años de antigüedad') ? `${ageYears} años` : (ageStatus || '')}</Text>
                                </View>
                            </FormSection>
                        </View>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerIconText}>📞 (33) 1952 7172</Text>
                    <Text style={styles.footerIconText}>✉️ seguimientoinmo@gmail.com</Text>
                    <Text style={[styles.footerIconText, { flex: 1 }]}>📍 Av. Mariano Otero 810, Jardines del Bosque, 45200, Guadalajara, Jalisco</Text>
                </View>
            </Page>

            {/* PAGE 2: SPECS, OBSERVATIONS & AUTHORIZATION */}
            <Page size="A4" style={styles.page}>
                <View style={styles.sidebarBlue} />
                <Image src={window.location.origin + "/assets/magno-logo.png"} style={styles.watermark} />

                <View style={styles.contentWrapper}>
                    <View style={styles.header}>
                        <Image src={window.location.origin + "/assets/magno-logo.png"} style={styles.logo} />
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.firmaText}>FIRMA</Text>
                            <Text style={styles.headerTitle}>ESPECIFICACIONES Y AUTORIZACIÓN LEGAL</Text>
                        </View>
                        <View style={styles.folioContainer}>
                            <Text style={styles.folioText}>FOLIO: {data.ref || data.folio || 'PENDIENTE'}</Text>
                        </View>
                    </View>

                    <FormSection title="CARACTERÍSTICAS DE LA PROPIEDAD Y MOBILIARIO">
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            <View style={{ width: '50%' }}>
                                <View style={styles.fieldRow}>
                                    <Text style={[styles.label, { width: '50%' }]}>Recámaras:</Text>
                                    <Text style={styles.value}>{data.rooms || '0'}</Text>
                                </View>
                                <View style={styles.fieldRow}>
                                    <Text style={[styles.label, { width: '50%' }]}>Niveles:</Text>
                                    <Text style={styles.value}>{data.levels || '1'}</Text>
                                </View>
                                <View style={styles.fieldRow}>
                                    <Text style={[styles.label, { width: '50%' }]}>Cochera:</Text>
                                    <Text style={styles.value}>{data.parking_spots || '0'}</Text>
                                </View>
                            </View>
                            <View style={{ width: '50%' }}>
                                <View style={styles.fieldRow}>
                                    <Text style={[styles.label, { width: '60%' }]}>Baños completos:</Text>
                                    <Text style={styles.value}>{data.bathrooms || '0'}</Text>
                                </View>
                                <View style={styles.fieldRow}>
                                    <Text style={[styles.label, { width: '60%' }]}>Medios baños:</Text>
                                    <Text style={styles.value}>{data.half_bathrooms || '0'}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={[styles.fieldRow, { marginTop: 10 }]}>
                            <Text style={styles.label}>Mobiliario:</Text>
                            <Text style={styles.value}>
                                {data.mobiliario && data.mobiliario.length > 0 ? data.mobiliario.join(', ') : 'Ninguno especificado'}
                            </Text>
                        </View>
                        <View style={styles.fieldRow}>
                            <Text style={styles.value}>${data.maintenance_fee ? parseFloat(data.maintenance_fee).toLocaleString('es-MX') : '0.00'}</Text>
                        </View>
                        <View style={[styles.fieldRow, { marginTop: 10 }]}>
                            <Text style={styles.label}>¿Tiene gravamen?:</Text>
                            <Text style={styles.value}>{isFreeOfEncumbrance !== undefined ? (isFreeOfEncumbrance ? 'No' : 'Sí') : ''}</Text>
                        </View>
                    </FormSection>



                    <FormSection title="AUTORIZACIÓN DE PUBLICACIÓN Y USO DE DATOS">
                        <Text style={styles.legalText}>
                            Autorizo a Magno Grupo Inmobiliario a publicar y promover mi propiedad para fines de {mode === 'rent' ? 'renta' : 'venta'}, utilizando los datos proporcionados en este formato estando de acuerdo en los honorarios pactados que el {mode === 'rent' ? 'primer mes de renta' : '5% del valor de venta'} y acepto el aviso de privacidad.
                        </Text>

                        <View style={{ marginTop: 15 }}>
                            <View style={styles.fieldRow}>
                                <Text style={styles.label}>Nombre del propietario:</Text>
                                <Text style={styles.value}>{ownerName}</Text>
                            </View>
                            <View style={styles.fieldRow}>
                                <Text style={styles.label}>Fecha:</Text>
                                <Text style={styles.value}>{date}</Text>
                            </View>
                        </View>

                        <View style={styles.signSection}>
                            <View style={styles.signBox}>
                                <View style={{ borderBottom: '1pt solid #000', height: 40, width: '100%' }} />
                                <Text style={[styles.label, { marginTop: 5 }]}>Firma del {mode === 'rent' ? 'arrendador' : 'vendedor'}</Text>
                            </View>
                            <View style={{ width: '45%' }}>
                                <Text style={[styles.sectionTitle, { fontSize: 8 }]}>AVISO DE PRIVACIDAD</Text>
                                <Text style={[styles.legalText, { fontSize: 7 }]}>
                                    El tratamiento de tus datos se realiza conforme a nuestro aviso de privacidad, disponible en nuestras oficinas físicas y portal digital oficial.
                                </Text>
                            </View>
                        </View>
                    </FormSection>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerIconText}>📞 (33) 1952 7172</Text>
                    <Text style={styles.footerIconText}>✉️ seguimientoinmo@gmail.com</Text>
                    <Text style={[styles.footerIconText, { flex: 1 }]}>📍 Av. Mariano Otero 810, Jardines del Bosque, 45200, Guadalajara, Jalisco</Text>
                </View>
            </Page>
        </Document>
    );
};

export default RecruitmentPDF;
